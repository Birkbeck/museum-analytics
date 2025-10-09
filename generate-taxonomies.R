library(janitor)
library(ggplot2)
library(igraph)
library(ggraph)
library(tidyverse)
library(readr)

source("shiny/mappingmuseums/src/modules/glossary/elements.R")
source("shiny/mappingmuseums/src/themes.R")

taxonomy_theme <- theme(
  panel.background = element_rect(fill="white"),
  plot.margin = unit(c(1, 1, 1, 1), "cm"),
  plot.title = element_text(size="18"),
  legend.position = "right",
  legend.title = element_text(size="14"),
  legend.text = element_text(size="12"),
  legend.background = element_rect(fill="white"),
  legend.key = element_rect(fill="white")
)

dispersal_events_csv <- "data/closure_data/dispersal_events.csv"
dispersal_events <- read_csv(dispersal_events_csv) |>
  mutate(
    initial_museum_all = "All",
    recipient_type = ifelse(is.na(recipient_type), "N/A", recipient_type),
    recipient_general_type = ifelse(is.na(recipient_general_type), "N/A", recipient_general_type),
    recipient_core_type = ifelse(!is.na(recipient_core_type), recipient_core_type, recipient_general_type),
    sender_core_type = ifelse(!is.na(sender_core_type), sender_core_type, sender_general_type),
    event_stage_in_path = event_stage_in_path + 1
  )

closure_reasons <- dispersal_events |>
    select(
      museum_id=initial_museum_id,
      museum_name=initial_museum_name,
      cause=super_event_cause_types,
      super_causes=super_event_causes
    ) |>
    distinct() |>
    separate_rows(cause, sep = "; ") |>
    separate_wider_delim(
      cause,
      " - ",
      names=c("closure_reason_top_level", "closure_reason_mid_level", "closure_reason_low_level"),
      too_few="align_start"
    ) |>
    mutate(
      closure_reason_mid_level = ifelse(
        is.na(closure_reason_mid_level),
        paste(closure_reason_top_level, "-", "other"),
        paste(closure_reason_top_level, "-", closure_reason_mid_level)
      ),
      closure_reason_low_level = ifelse(
        is.na(closure_reason_low_level),
        paste(closure_reason_mid_level, "-", "other"),
        paste(closure_reason_mid_level, "-", closure_reason_low_level)
      )
    )

core_reasons <- closure_reasons |>
  select(type_name=closure_reason_top_level) |>
  distinct() |>
  mutate(sub_type_of="", is_core=TRUE)
sub_core_reasons <- closure_reasons |>
  select(type_name=closure_reason_mid_level, sub_type_of=closure_reason_top_level) |>
  distinct() |>
  mutate(is_core=FALSE) |>
  filter(!is.na(type_name))
specific_reasons <- closure_reasons |>
  select(type_name=closure_reason_low_level, sub_type_of=closure_reason_mid_level) |>
  distinct() |>
  mutate(is_core=FALSE) |>
  filter(!is.na(type_name), !is.na(sub_type_of))
core_reasons |>
  rbind(sub_core_reasons) |>
  rbind(specific_reasons) |>
  write_csv("data-model/reason_types.csv")

size_types_csv <- "data-model/size_types.csv"
size_types <- read_csv(size_types_csv)
size_hierarchy <- size_taxonomy(size_types)
ggsave(
  file="shiny/mappingmuseums/www/size_types.png",
  plot=size_hierarchy,
  width=14,
  height=4
)

governance_types_csv <- "data-model/governance_types.csv"
governance_types <- read_csv(governance_types_csv)
governance_hierarchy <- governance_taxonomy(governance_types)
ggsave(
  file="shiny/mappingmuseums/www/governance_types.png",
  plot=governance_hierarchy,
  width=14,
  height=6
)

subject_types_csv <- "data-model/subject_types.csv"
subject_types <- read_csv(subject_types_csv)
subject_hierarchy <- subject_taxonomy(subject_types)
ggsave(
  file="shiny/mappingmuseums/www/subject_types.png",
  plot=subject_hierarchy,
  width=14,
  height=18
)

actor_types_csv <- "data-model/actor_types.csv"
actor_types <- read_csv(actor_types_csv)
actor_type_hierarchy <- actors_taxonomy()
ggsave(
  file="shiny/mappingmuseums/www/actor_types.png",
  plot=actor_type_hierarchy,
  width=14,
  height=16
)

event_types_csv <- "data-model/event_types.csv"
event_types <- read_csv(event_types_csv)
event_type_hierarchy <- events_taxonomy()
ggsave(
  file="shiny/mappingmuseums/www/event_types.png",
  plot=event_type_hierarchy,
  width=14,
  height=12
)

reason_type_hierarchy <- reasons_taxonomy()
ggsave(
  file="shiny/mappingmuseums/www/reason_types.png",
  plot=reason_type_hierarchy,
  width=14,
  height=16
)
