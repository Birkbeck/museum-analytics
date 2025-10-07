# Museum Object Flows

This repository contains data and software tools collected and developed in a research project covering museum closure in the UK between 2000 and 2025 and the flows of objects away from those museums.

## The Museum Closure Project

The collection of data and development of tools in this repository was undertaken as part of the project ["Museum Closure in the UK 2000–2025"](https://mapping-museums.bbk.ac.uk/museum-closure-in-the-uk-2000-2025/), funded by UKRI-AHRC Grant No. AH/X012816/1, October 2023–September 2025.

The data in this repository was collected and curated by Mark Liebenrood and Fiona Candlin. The tools were designed and implemented by George A. Wright, Andrea Ballatore, Alexandra Poulovassilis, and Peter T. Wood.

The creation of the tools in this repository is described in the paper: Wright, G.A. and Ballatore, A. and Poulovassilis, A. and Wood, P.T. Modelling and visualizing flows of cultural objects (submitted for review).

## Data

The `data` directory contains data concerning museums in the UK, closures that took place between 2000 and 2025, and the flows of objects away from those museums.

The data includes a CSV dump of the Mapping Museums database and a spreadsheet detailing closures and object flows. These are both used to generate a Neo4j database. The directory also contains CSV dumps from that database and summary tables used in the creation of a report.

The data describes the dispersal of collections away from approximately 500 UK museums that have closed between 2000 and 2025. It details the different types of event that collections and objects are involved in and the different types of actor and location that collections flow between.

## Data Model

The `data-model` directory contains the data model used in this research including the entities and relations used to represent object flows; taxonomies of actor types, event types, and reasons for museum closure; and the attributes of museums.

## Software

The source code in `sheet_to_graph` provides a tool that validates object flow data in spreadsheet format and translates it into a Neo4j database.

The source code in `shiny/mappingmuseums` provides an interactive web app for exploring the data.

The source code in `llm-data-modelling` describes experiments used for the automated modelling of texts describing the buildings of closed museums.

## Instructions for Use

- Follow the setup instructions inside `sheet_to_graph/readme.md` and `shiny/mappingmuseums/readme.md` to setup the database and web app hosting.
- From this directory you can run the following commands:
  - `make reset-db` - Clears the contents of your Neo4j database.
  - `make upload-db` - Reads data from the spreadsheet, validates it, and uploads it to the Neo4j database.
  - `make dump-db` - Creates 3 csv files containing all data from the Neo4j database (`dispersal_events.csv`, `event_types.csv`, `actor_types.csv`).
  - `make deploy-app-local` - Deploys the Shiny app and opens it in your default web browser.
  - `make deploy-app` - Deploys the Shiny app to a remote server.

## See Also

- [Mapping Museums](https://github.com/Birkbeck/mapping-museums)
- [Museums in the Pandemic](https://github.com/Birkbeck/museums-in-the-pandemic)