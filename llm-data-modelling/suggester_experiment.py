from collections import defaultdict
import datetime
import json
import math
import os
from dotenv import load_dotenv
import random
import statistics
import warnings

import Levenshtein
import pandas as pd
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, set_seed

random.seed(1)

load_dotenv()

START = 0
END = 300
OUTPUT_DIRECTORY = os.getenv("OUTPUT_DIRECTORY")

# don't warn that filter fields from spreadsheet are being ignored
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")


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


def extract_json_chunk(text):
    json_chunk = text.split("```")[1]
    if json_chunk[:4] == "json":
        json_chunk = json_chunk[4:]
    return json.loads(json_chunk)


def json_keys_as_list(obj, prefix=""):
    keys = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            full_key = f"{prefix}-{key}" if prefix else key
            keys.extend(json_keys_as_list(value, full_key))
    elif isinstance(obj, list):
        for item in obj:
            full_key = f"{prefix}-0" if prefix else "0"
            keys.extend(json_keys_as_list(item, full_key))
    else:
        keys.append(prefix.lower())
    return keys


def json_keys_evaluation(text):
    """Returns precision, recall, and F1 of JSON within text
    measured in terms of the number of keys which are correct."""
    try:
        json_chunk = extract_json_chunk(text)
    except Exception:
        return {"precision": 0, "recall": 0, "f1": 0}
    expected_keys = [
        "entities-0-name",
        "entities-0-properties-0-name",
        "entities-0-properties-0-data_type",
        "relations-0-name",
        "relations-0-source",
        "relations-0-target",
        "relations-0-properties-0-name",
        "relations-0-properties-0-data_type",
        "enumerated_types-0-name",
        "enumerated_types-0-values-0",
    ]
    keys = [k.lower() for k in json_keys_as_list(json_chunk)]
    correct_keys = [k for k in keys if k in expected_keys]
    precision = len(correct_keys) / len(keys) if len(keys) > 0 else 0
    recall = len(set(correct_keys)) / len(set(expected_keys))
    f1 = (
        0
        if precision + recall == 0
        else 2 * (precision * recall) / (precision + recall)
    )
    return {"precision": precision, "recall": recall, "f1": f1}


MEMOIZED_SIMILARITIES = defaultdict(dict)
HIGHEST_SIMILARITIES = {}
EXPECTED_KEYS = [
    "entities-0-name",
    "entities-0-properties-0-name",
    "entities-0-properties-0-data_type",
    "relations-0-name",
    "relations-0-source",
    "relations-0-target",
    "relations-0-properties-0-name",
    "relations-0-properties-0-data_type",
    "enumerated_types-0-name",
    "enumerated_types-0-values-0",
]


def string_similarity(a, b):
    try:
        return MEMOIZED_SIMILARITIES[a][b]
    except KeyError:
        distance = Levenshtein.distance(a, b)
        max_string_length = max(len(a), len(b))
        similarity = 1 - (distance / max_string_length)
        MEMOIZED_SIMILARITIES[a][b] = similarity
        return similarity


def highest_string_similarity(a):
    try:
        return HIGHEST_SIMILARITIES[a]
    except KeyError:
        highest_similarity = max([string_similarity(a, b) for b in EXPECTED_KEYS])
        HIGHEST_SIMILARITIES[a] = highest_similarity
        return highest_similarity


def json_keys_soft_evaluation(text):
    """Returns precision, recall, and F1 of JSON within text
    measured in terms of the string edit distance of keys to required keys."""

    try:
        json_chunk = extract_json_chunk(text)
    except Exception:
        return {"precision": 0, "recall": 0, "f1": 0}
    expected_keys = [
        "entities-0-name",
        "entities-0-properties-0-name",
        "entities-0-properties-0-data_type",
        "relations-0-name",
        "relations-0-source",
        "relations-0-target",
        "relations-0-properties-0-name",
        "relations-0-properties-0-data_type",
        "enumerated_types-0-name",
        "enumerated_types-0-values-0",
    ]
    keys = [k.lower() for k in json_keys_as_list(json_chunk)]
    predicted_key_distances = {k: highest_string_similarity(k) for k in keys}
    correctness_of_keys = [predicted_key_distances[k] for k in keys]
    precision = sum(correctness_of_keys) / len(keys) if len(keys) > 0 else 0
    expected_key_distances = {
        e: max([string_similarity(e, k) for k in keys]) for e in expected_keys
    }
    recall = sum(expected_key_distances.values()) / len(expected_keys)
    f1 = (
        0
        if precision + recall == 0
        else 2 * (precision * recall) / (precision + recall)
    )
    return {"precision": precision, "recall": recall, "f1": f1}


def get_chunk_of_museums(table, number_of_rows, column_name):
    table_chunk = table.iloc[0:number_of_rows]
    return "\n".join(
        [f"{row['name']}: {row[column_name]}" for _, row in table_chunk.iterrows()]
    )


def chunk_generator_by_size(table, chunk_size, column_name):
    """A generator that yields chunks of the table as text of the form:
    museum name: text from column_name"""
    number_of_rows = len(table)
    total_characters = sum([len(str(row[column_name])) for _, row in table.iterrows()])
    characters_per_row = total_characters / number_of_rows
    rows_per_chunk = math.ceil(chunk_size / characters_per_row)
    for i in range(0, number_of_rows, rows_per_chunk):
        table_chunk = table.iloc[i : i + rows_per_chunk]
        museum_details_chunk = "\n".join(
            [f"{row['name']}: {row[column_name]}" for _, row in table_chunk.iterrows()]
        )
        yield museum_details_chunk


def make_suggester_prompt(
    role_description,
    input_description,
    task_description,
    chain_of_thought,
    data_chunk,
    example,
):
    return "\n".join(
        [
            role_description,
            input_description,
            task_description,
            chain_of_thought,
            example,
            data_chunk,
            "Data model:",
        ]
    )


llms = {
    # "gpt2": pipeline(
    #    "text-generation",
    #    model=AutoModelForCausalLM.from_pretrained("gpt2"),
    #    tokenizer=AutoTokenizer.from_pretrained("gpt2"),
    #    device=0,
    # ),
    "llama3": pipeline(
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
    ),
}
temperatures = {
    "0.01": 0.01,
    # "0.1": 0.1,
    # "1.0": 1.0,
}
chunk_sizes = {
    "1k": 1000,
    "2k": 2000,
    "3k": 3000,
    "4k": 4000,
}
role_descriptions = {
    "null": "",
    "data modeller": "You are a data modeller interested in the aftermath of museum closure.",
    "machine": "You are a machine which communicates only in JSON.",
}
input_descriptions = {
    "basic": "Here is a list of closed museums and the current use of their buildings.",
}
output_schema = """{
    "entities": [
        {
            "name": "...",
            properties: [
                {"name": "...", "data_type": "..."},
                ...
            ]
        },
        ...
    ],
    "relations": [
        {
            "name": "...",
            "source": entity_type,
            "target": entity_type,
            properties: [
                {"name": "...", "data_type": "..."},
                ...
            ]
        },
        ...
    ]
}
"""
output_schema_with_enums = """{
    "entities": [
        {
            "name": "...",
            properties: [
                {"name": "...", "data_type": "..."},
                ...
            ]
        },
        ...
    ],
    "relations": [
        {
            "name": "...",
            "source": entity_type,
            "target": entity_type,
            properties: [
                {"name": "...", "data_type": "..."},
                ...
            ]
        },
        ...
    ],
    "enumerated_types": [
        {
            "name": "...",
            "values": [
                "..."
            ]
        },
        ...
    ]
}
"""

task_descriptions = {
    "basic": f"""Suggest appropriate entity and relations types so that this data can be modelled with a graph database
Use JSON of the form:
```
{output_schema}
```
Avoid overly specific data types.
Do not write any full English sentences.
""",
    #    "basic+enums": f"""Suggest appropriate entity and relations types so that this data can be modelled with a graph database
    # Use JSON of the form:
    # ```
    # {output_schema_with_enums}
    # ```
    # Avoid overly specific data types.
    # Do not write any full English sentences.
    # """,
    "basic+hierarchy": f"""Suggest appropriate entity and relations types so that this data can be modelled with a graph database.
Include entities and relations necessary for making type hierarchies if appropriate.
Use JSON of the form:
```
{output_schema}
```
Avoid overly specific data types.
Do not write any full English sentences.
""",
    "basic+hierarchy+enums": f"""Suggest appropriate entity and relations types so that this data can be modelled with a graph database
Include entities and relations necessary for making type hierarchies if appropriate.
Use JSON of the form:
```
{output_schema_with_enums}
```
Avoid overly specific data types.
Do not write any full English sentences.
""",
    "chain-of-thought": "",
}

museum_details_table = (
    pd.read_excel(os.getenv("NOTES_SPREADSHEET"))[
        [
            "name",
            "Collection dispersal",
            "reasons for closure",
            "Building",
        ]
    ]
    .dropna(how="all")
    .apply(lambda col: col.map(lambda x: x.strip() if isinstance(x, str) else x))
    .sample(frac=1, random_state=42)  # shuffle the table
    .reset_index(drop=True)  # reset row numbers
)

with open("dispersal_data_model_simple.json", "r") as f:
    example_model = f.read()
    example_model_json = json.loads(example_model)

collections_chunk_1 = get_chunk_of_museums(
    museum_details_table, 1, "Collection dispersal"
)
collections_chunk_3 = get_chunk_of_museums(
    museum_details_table, 3, "Collection dispersal"
)
collections_chunk_5 = get_chunk_of_museums(
    museum_details_table, 5, "Collection dispersal"
)

examples = {
    "0": "",
    "0.5": f"""An example data model used to describe events involving museum objects and collections is given below:
Data model:
{example_model}""",
    #    "1-1": f"""Some example text describing the dispersal of museum objects and collections and a data model that can describe it are given below:
    # Input text:
    # {collections_chunk_1}
    # Data model:
    # {example_model}""",
    #    "1-3": f"""Some example text describing the dispersal of museum objects and collections and a data model that can describe it are given below:
    # Input text:
    # {collections_chunk_3}
    # Data model:
    # {example_model}""",
    "1-5": f"""Some example text describing the dispersal of museum objects and collections and a data model that can describe it are given below:
Input text:
{collections_chunk_5}
Data model:
{example_model}""",
}

with open("one-shot-chain-of-thought.txt", "r") as f:
    one_shot_chain_of_thought_prompt = f.read().format(example_model=example_model)

chain_of_thought_types = {
    "null": "",
    "zero-shot": "Let's think step-by-step.",
    "one-shot": one_shot_chain_of_thought_prompt,
}

suggester_experiments = [
    {
        "seed": seed if temperature != "0.0" else 0,
        "llm": llm,
        "temperature": temperature,
        "chunk_size": chunk_size,
        "role_description": role_description,
        "input_description": input_description,
        "example": example,
        "task_description": task_description,
        "chain_of_thought": chain_of_thought,
    }
    for seed in range(1)
    for llm in llms
    for temperature in temperatures
    for chunk_size in chunk_sizes
    for role_description in role_descriptions
    for input_description in input_descriptions
    for example in examples
    for task_description in task_descriptions
    for chain_of_thought in ["null", "zero-shot"]
] + [
    {
        "seed": seed if temperature != "0.0" else 0,
        "llm": llm,
        "temperature": temperature,
        "chunk_size": chunk_size,
        "role_description": role_description,
        "input_description": input_description,
        "example": "1-5",
        "task_description": "chain-of-thought",
        "chain_of_thought": "one-shot",
    }
    for seed in range(1)
    for llm in llms
    for temperature in temperatures
    for chunk_size in chunk_sizes
    for role_description in role_descriptions
    for input_description in input_descriptions
]

unique_suggester_experiments = []
for experiment in suggester_experiments:
    if experiment in unique_suggester_experiments:
        continue
    unique_suggester_experiments.append(experiment)
suggester_experiments = unique_suggester_experiments


random.shuffle(suggester_experiments)
suggester_experiments = suggester_experiments[START:END]


if __name__ == "__main__":
    total_experiments = len(suggester_experiments)
    for i, experiment in enumerate(suggester_experiments):
        experiment_number = i + 1
        print(f"{experiment_number}/{total_experiments}")
        print(
            "seed:",
            experiment["seed"],
            "| llm:",
            experiment["llm"],
            "| temperature:",
            experiment["temperature"],
            "| chunk size:",
            experiment["chunk_size"],
            "| role:",
            experiment["role_description"],
            "| input:",
            experiment["input_description"],
            "| task:",
            experiment["task_description"],
            "| CoT:",
            experiment["chain_of_thought"],
            "| eg:",
            experiment["example"],
        )
        seed = experiment["seed"]
        llm = llms[experiment["llm"]]
        temperature = temperatures[experiment["temperature"]]
        chunk_size = chunk_sizes[experiment["chunk_size"]]
        role_description = role_descriptions[experiment["role_description"]]
        input_description = input_descriptions[experiment["input_description"]]
        example = examples[experiment["example"]]
        task_description = task_descriptions[experiment["task_description"]]
        chain_of_thought = chain_of_thought_types[experiment["chain_of_thought"]]

        outputs = []

        chunk_number = 0
        for chunk in chunk_generator_by_size(
            museum_details_table, chunk_size, "Building"
        ):
            chunk_number += 1
            if experiment["chain_of_thought"] == "one-shot":
                prompt = "\n".join([chain_of_thought, chunk])
            else:
                prompt = make_suggester_prompt(
                    role_description=role_description,
                    input_description=input_description,
                    task_description=task_description,
                    chain_of_thought=chain_of_thought,
                    example=example,
                    data_chunk=chunk,
                )
            try:
                response = get_llm_response(
                    model=llm,
                    seed=seed,
                    prompt=prompt,
                    temperature=temperature,
                )
            except Exception as e:
                print(e)
                response = ""

            outputs.append(response)

        experiment["outputs"] = outputs

        now = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        output_file_name = (
            f"{OUTPUT_DIRECTORY}suggester_results-{START}-{END}-{now}.json"
        )
        with open(output_file_name, "w") as f:
            json.dump(suggester_experiments, f)
