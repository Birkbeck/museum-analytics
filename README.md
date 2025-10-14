# Museum Closure in the UK 2000-2025

This repository contains data and software tools collected and developed in a research project covering museum closure in the UK between 2000 and 2025 and the flows of objects away from those museums. The PI is Prof *Fiona Candlin* (Birkbeck, University of London). The project is conducted at the [Mapping Museums Lab](https://mapping-museums.bbk.ac.uk/) (Birkbeck, University of London) and at the [Cultural Geo-Analytics Lab](https://www.kcl.ac.uk/research/cultural-geo-analytics-lab) (King's College London).

## The Museum Closure Project

The collection of data and development of tools in this repository was undertaken as part of the project ["Museum Closure in the UK 2000–2025"](https://mapping-museums.bbk.ac.uk/museum-closure-in-the-uk-2000-2025/), funded by UKRI-AHRC Grant No. AH/X012816/1, October 2023–September 2025.

The data in this repository was collected and curated by Mark Liebenrood and Fiona Candlin. The tools were designed and implemented by George A. Wright, Andrea Ballatore, Alexandra Poulovassilis, and Peter T. Wood.

The creation of the tools in this repository is described in the paper: Wright, G.A. and Ballatore, A. and Poulovassilis, A. and Wood, P.T. Modelling and visualizing flows of cultural objects (submitted for review).

## Download the data

The [`data`](data/) directory contains data concerning *museum closures that took place in the UK between 2000 and 2025*, and the *dispersal of their collections*. All this data is contained and documented in the [`closure_data`](data/closure_data) sub-directory. 

 It details the different types of event that collections and objects are involved in and the different types of actor and location that collections flow between.

The data directory also includes a CSV snapshot of the Mapping Museums database and a spreadsheet detailing closures and object flows. These are both used by the [`sheet_to_graph`](sheet_to_graph/) utility to generate a Neo4j database. The files in [`data/closure_data`](data/closure_data) are exported from that database.

The files in [`data/report_data_01_08_2025`](data/report_data_01_08_2025) contain summary tables generated from a 1st August 2025 snapshot of the database. These summary tables were used to generate figures used in the report Candlin _et al_ _Collections From Closed Museums in the UK 2000-25: A report on the data_.

## Data model

The [`data-model`](data-model/) directory contains the data model (conceptual model) developed during this research project, including the entities and relations used to represent object flows; taxonomies of actor types, event types, and reasons for museum closure; and the attributes of museums. These resources are designed to be reusable by other museum-related projects, practices, and studies. 

## Software

The software tools in this repository can be used in conjunction with the above mentioned data to generate a Neo4j graph database, to query the database, and to produce an interactive application for data exploration and visualization.

### Source code

The source code in [`sheet_to_graph`](sheet_to_graph/) provides a tool that validates object flow data in spreadsheet format and translates it into a Neo4j database.

The source code in [`shiny/mappingmuseums`](shiny/mappingmuseums) provides an interactive web app for exploring the data.

The source code in [`llm-data-modelling`](llm-data-modelling/) describes experiments used for the automated generation of a data model from notes describing what happened to the buildings of closed museums.

### Instructions for Use

- Follow the setup instructions inside `sheet_to_graph/readme.md` and `shiny/mappingmuseums/readme.md` to setup the database and web app hosting.
- From this directory you can run the following commands:
  - `make reset-db` - Clears the contents of your Neo4j database.
  - `make upload-db` - Reads data from the spreadsheet, validates it, and uploads it to the Neo4j database.
  - `make dump-db` - Creates three csv files containing all data from the Neo4j database (`dispersal_events.csv`, `event_types.csv`, `actor_types.csv`).
  - `make deploy-app-local` - Deploys the Shiny app and opens it in your default web browser.
  - `make deploy-app` - Deploys the Shiny app to a remote server.

## Research team

- Fiona Candlin, Professor of Museology, School of Historical Studies 
- Andrea Ballatore, Senior Lecturer in Cultural Data Science, Cultural Geo-Analytics Lab, Department of Digital Humanities, King's College London. 
- Mark Liebenrood, Post-doctoral Researcher (data collection), School of Historical Studies 
- Alexandra Poulovassilis, Professor Emerita, School of Computing and Mathematical Sciences  
- Peter T Wood, Professor of Computer Science, School of Computing and Mathematical Sciences 
- George A Wright, Post-doctoral Researcher (Computer Science) School of Computing and Mathematical Sciences 
- Helena Bonett, Researcher (data collection), School of Historical Studies 
- Maria Golovteeva, Researcher (data collection), School of Historical Studies 

## License & usage

This repository (code and data) is released under the  
**Creative Commons Attribution–NonCommercial 4.0 International License (CC BY-NC 4.0)**.

> ✅ **Allowed**: Non-commercial academic research, teaching, cultural heritage scholarship  
> 🚫 **Not allowed**: Commercial use without written permission from Birkbeck, University of London  
> 📎 **Attribution required**: Candlin et al. (2025), TBC <https://github.com/Birkbeck/museum-object-flows>

🔗 License details: <https://creativecommons.org/licenses/by-nc/4.0/>

If used in publications or presentations, please cite:

> TBC (2025), <https://github.com/Birkbeck/museum-object-flows>

## See also

- [Mapping Museums Lab](https://mapping-museums.bbk.ac.uk/) - Research lab on museology at Birkbeck, University of London.
- [Mapping Museums](https://github.com/Birkbeck/mapping-museums) - A repository containing code and data relevant to the creation of the Mapping Museums database.
- [Museums in the Pandemic](https://github.com/Birkbeck/museums-in-the-pandemic) - A repository containing code and data for the project Museums in the Pandemic (MIP): Risk, Closure, and Resilience.