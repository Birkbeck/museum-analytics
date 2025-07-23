from collections import defaultdict
import csv
import json
import os
import statistics


import Levenshtein

RESULTS_DIRECTORY = "results-collator"


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


def extract_json_chunk(text, prompt):
    text = text[len(prompt) :]
    text_chunks = text.split("```")
    json_chunk = []
    for chunk in text_chunks:
        try:
            if chunk[0:4] == "json":
                json_chunk = json.loads(chunk[4:])
            else:
                json_chunk = json.loads(chunk)
        except Exception as e:
            pass
    return json_chunk


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


def json_keys_soft_evaluation(text, prompt):
    """Returns precision, recall, and F1 of JSON within text
    measured in terms of the string edit distance of keys to required keys."""

    try:
        json_chunk = extract_json_chunk(text, prompt)
        print(json_chunk)
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
        e: max([string_similarity(e, k) for k in keys] + [0]) for e in expected_keys
    }
    recall = sum(expected_key_distances.values()) / len(expected_keys)
    f1 = (
        0
        if precision + recall == 0
        else 2 * (precision * recall) / (precision + recall)
    )
    return {"precision": precision, "recall": recall, "f1": f1}


results_files = os.listdir(RESULTS_DIRECTORY)

results = []
for results_file in results_files:
    print(results_file)
    try:
        with open(f"{RESULTS_DIRECTORY}/{results_file}", "r") as f:
            result_data = json.load(f)
            for result in result_data:
                if "collator_response" in result:
                    results.append(result)
    except Exception as e:
        print(f"   {e}")

with open("best_suggester_results.json", "r") as f:
    results_string = f.read()
    suggester_experiment_results = json.loads(results_string)

    print(len(results))
    for result in results:
        print("collator_response" in result)
        exit()

best_result = None
highest_f1 = 0
prompt_lengths = []
for result in results:
    result["collator_prompt"] = make_collator_prompt(result)
    prompt_lengths.append(len(result["collator_prompt"]))
    try:
        output = result["collator_response"]
        collator_prompt = result["collator_prompt"]
    except KeyError:
        continue
    evaluation = json_keys_soft_evaluation(output, collator_prompt)
    result["collator_precision"] = evaluation["precision"]
    result["collator_recall"] = evaluation["recall"]
    result["collator_f1"] = evaluation["f1"]
    print(result["collator_f1"])
    if result["collator_f1"] > highest_f1:
        highest_f1 = result["collator_f1"]
        best_result = result

with open(f"collator_experiments_analysis.json", "w") as f:
    json.dump([r for r in results if "collator_f1" in r], f)

with open(f"collator_experiments_analysis.csv", "w") as f:
    fields = [
        "chunk_size",
        "role_description",
        "task_description",
        "chain_of_thought",
        "collator_precision",
        "collator_recall",
        "collator_f1",
    ]
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows([{k: v for k, v in r.items() if k in fields} for r in results])

best_result_json = extract_json_chunk(
    best_result["collator_response"], best_result["collator_prompt"]
)

print(json.dumps(best_result_json, indent=2))

with open("best_model_output.json", "w") as f:
    json.dump(f, best_result_json)
