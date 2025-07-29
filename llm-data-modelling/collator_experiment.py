import datetime
from dotenv import load_dotenv
import gc
import json
import os

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, set_seed

load_dotenv()

START = 0
END = 10
OUTPUT_DIRECTORY = os.getenv("OUTPUT_DIRECTORY")


def extract_json_chunk(text, prompt):
    text = text[len(prompt) :]
    text_chunks = text.split("```")
    json_chunk = []
    for chunk in text_chunks:
        try:
            json_chunk = json.loads(chunk)
        except Exception as e:
            pass
    return json_chunk


def make_collator_prompt(suggester_result):
    suggestions = [
        json.dumps(
            extract_json_chunk(
                suggester_result["outputs"][i], suggester_result["prompts"][i]
            ),
            indent=2,
        )
        for i in range(len(suggester_result["outputs"]))
    ]
    instruction = "Combine these suggested entity and relation models into a single model which incorporates characteristics from each of the suggestions\n```"
    prompt = instruction + "```\n```".join(suggestions) + "```"
    return prompt


def get_llm_response(model, prompt, temperature, seed=123):
    set_seed(seed)
    try:
        response = model(
            prompt, num_return_sequences=1, max_new_tokens=2000, temperature=temperature
        )
        return response[0]["generated_text"]
    except RuntimeError as e:
        print("Caught CUDA error:", e)
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        return f"CUDA error, {e}"


with open("best_suggester_results.json", "r") as f:
    results_string = f.read()
    suggester_experiment_results = json.loads(results_string)

llm = pipeline(
    "text-generation",
    model=AutoModelForCausalLM.from_pretrained(
        "/users/k2480370/llama3.1-8B",
        trust_remote_code=True,
    ),
    tokenizer=AutoTokenizer.from_pretrained(
        "/users/k2480370/llama3.1-8B",
        trust_remote_code=True,
    ),
    device=0,
    pad_token_id=0,
)

for result in suggester_experiment_results[START:END]:
    collator_prompt = make_collator_prompt(result)

    try:
        collator_response = get_llm_response(
            model=llm, prompt=collator_prompt, temperature=0.01
        )
    except Exception as e:
        print(e)
        collator_response = ""

    result["collator_response"] = collator_response

    # manually flush memory
    gc.collect()
    torch.cuda.empty_cache()

    now = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    output_file_name = f"{OUTPUT_DIRECTORY}collator_results-{START}-{END}-{now}.json"
    with open(output_file_name, "w") as f:
        json.dump(suggester_experiment_results, f)
