import requests


class WikidataConnection:
    def search_entities(self, search_term, limit=3):
        url = "https://www.wikidata.org/w/api.php"
        params = {
            "action": "wbsearchentities",
            "format": "json",
            "language": "en",
            "search": search_term,
            "limit": limit,
        }
        response_data = requests.get(url, params=params).json()
        results = []
        for item in response_data.get("search", []):
            results.append(
                {
                    "id": item.get("id"),
                    "label": item.get("label"),
                    "description": item.get("description"),
                }
            )
            return results

    def get_entity_properties(self, qid):
        url = f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"
        response_data = requests.get(url).json()
        entity = response_data["entities"][qid]
        claims = entity.get("claims", {})
        properties = {}
        for pid, statements in claims.items():
            for stmt in statements:
                mainsnak = stmt.get("mainsnak", {})
                if mainsnak.get("datatype") == "wikibase-item":
                    try:
                        value_qid = mainsnak["datavalue"]["value"]["id"]
                        properties[pid] = value_qid
                    except KeyError:
                        continue
                else:
                    try:
                        value = mainsnak["datavalue"]["value"]
                        properties[pid] = value
                    except KeyError:
                        continue
        return properties
