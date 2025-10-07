# Data

This directory contains the data used for the various analyses of the Museum Closure project.

- `mapping_museums_data`: snapshots in CSV format of the Mapping Museums database.
- `dispersal_sheets`: snapshots in XLSX format of data concerning the flow of objects away from closed museums. The latest dispersal sheet and Mapping Museums snapshot can be used with the `sheet_to_graph` tool to populate a Neo4j database of collection dispersal.
- `closure_data`: data in CSV format dumped from the Neo4j database of collection dispersal.
- `report_data`: summary tables based on `closure_data` in XLSX format used in the preparation of the report Candlin _et al_ _Collections From Closed Museums in the UK 2000-25: A report on the data_.