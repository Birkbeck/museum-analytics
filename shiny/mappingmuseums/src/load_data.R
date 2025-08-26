set.seed(1)

DEBOUNCE_TIME <- 1000

core_actor_types_with_children <- c(
  "armed forces",
  "civic organisation",
  "company",
  "education/research",
  "heritage",
  "leisure",
  "library/archive",
  "other organisation",
  "service",
  "society",
  "storage",
  "temporary museum",
  "trader",
  "transport provider"
)

calculate_distance <- function(lat1, lon1, lat2, lon2) {
  # Convert degrees to radians
  radians <- function(degrees) {
    degrees * pi / 180
  }
  earth_radius <- 6371
  dlat <- radians(lat2 - lat1)
  dlon <- radians(lon2 - lon1)
  lat1 <- radians(lat1)
  lat2 <- radians(lat2)
  # Haversine formula
  a <- sin(dlat / 2) * sin(dlat / 2) +
    cos(lat1) * cos(lat2) * sin(dlon / 2) * sin(dlon / 2)
  c <- 2 * atan2(sqrt(a), sqrt(1 - a))
  # Distance in kilometers
  distance <- earth_radius * c
  # Distance in miles
  distance <- distance * 0.621371
  return(distance)
}

super_events_csv <- "data/query_results/super_events.csv"
super_events <- read_csv(super_events_csv)

event_types_csv <- "data/query_results/event_types.csv"
event_types <- read_csv(event_types_csv)

dispersal_events_csv <- "data/query_results/dispersal_events.csv"
dispersal_events <- read_csv(dispersal_events_csv) |>
  mutate(
    event_stage_in_path = event_stage_in_path + 1,
    recipient_type = case_when(
      is.na(recipient_type) ~ "N/A",
      recipient_type %in% core_actor_types_with_children ~ paste("unspecified", recipient_core_type),
      recipient_type == "actor" ~ "unspecified actor",
      TRUE ~ recipient_type
    ),
    recipient_core_type = case_when(
      recipient_type == "N/A" ~ "N/A",
      recipient_type == "unspecified actor" ~ "unspecified actor",
      TRUE ~ recipient_core_type
    ),
    sender_type = case_when(
      is.na(sender_type) ~ "N/A",
      sender_type %in% core_actor_types_with_children ~ paste("unspecified", sender_core_type),
      sender_type == "actor" ~ "unspecified actor",
      TRUE ~ sender_type
    ),
    sender_core_type = case_when(
      is.na(sender_type) ~ "N/A",
      sender_type == "unspecified actor" ~ "unspecified actor",
      TRUE ~ sender_core_type
    ),
    recipient_region = case_when(
      recipient_type == "end of existence" ~ "end of existence",
      recipient_type == "N/A" ~ "N/A",
      !is.na(recipient_region) ~ recipient_region,
      !is.na(recipient_country) ~ recipient_country,
      !is.na(destination_region) ~ destination_region,
      !is.na(destination_country) ~ destination_country,
      TRUE ~ "unknown"
    ),
    sender_region = case_when(
      sender_type == "end of existence" ~ "end of existence",
      !is.na(sender_region) ~ sender_region,
      !is.na(sender_country) ~ sender_country,
      !is.na(sender_region) ~ sender_region,
      !is.na(sender_country) ~ sender_country,
      TRUE ~ "unknown"
    ),
    collection_status = case_when(
      collection_status == "collection" ~ "Objects from a museum collection",
      collection_status == "loan" ~ "Objects on loan to a museum",
      collection_status == "handling" ~ "Handling objects",
      collection_status == "museum-stuff" ~ "Other objects (e.g. display cases)"
    ),
    initial_museum_all = "all",
    sender_all = ifelse(!is.na(sender_size), "all", NA),
    recipient_all = ifelse(!is.na(recipient_size), "all", NA),
    distance=calculate_distance(
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude
    ),
    distance_category=case_when(
      recipient_type == "end of existence" ~ "end of existence",
      is.na(distance) ~ "unknown",
      distance == 0 ~ "0",
      distance < 1 ~ "0 - 1",
      distance < 10 ~ "1 - 10",
      distance < 100 ~ "10 - 100",
      distance < 1000 ~ "100 - 1,000",
      TRUE ~ "1,000+"
    ),
    distance_category=factor(
      distance_category,
      c("all", "unknown", "end of existence", "0", "0 - 1", "1 - 10", "10 - 100", "100 - 1,000", "1,000+")
    ),
    distance_from_initial_museum=calculate_distance(
      initial_museum_latitude,
      initial_museum_longitude,
      destination_latitude,
      destination_longitude
    ),
    distance_from_initial_museum_category=case_when(
      recipient_type == "end of existence" ~ "end of existence",
      is.na(distance) ~ "unknown",
      distance == 0 ~ "0",
      distance < 1 ~ "0 - 1",
      distance < 10 ~ "1 - 10",
      distance < 100 ~ "10 - 100",
      distance < 1000 ~ "100 - 1,000",
      TRUE ~ "1,000+"
    ),
    distance_from_initial_museum_category=factor(
      distance_from_initial_museum_category,
      c("all", "unknown", "end of existence", "0", "0 - 1", "1 - 10", "10 - 100", "100 - 1,000", "1,000+")
    )
  )

senders <- dispersal_events |>
  select(
    actor_id=sender_id,
    name=sender_name,
    quantity=sender_quantity,
    sector=sender_sector,
    type=sender_type,
    size=sender_size,
    governance=sender_governance,
    accreditation=sender_accreditation,
    town=sender_town,
    county=sender_county,
    postcode=sender_postcode,
    region=sender_region,
    country=sender_country
  )
recipients <- dispersal_events |>
  select(
    actor_id=recipient_id,
    name=recipient_name,
    quantity=recipient_quantity,
    sector=recipient_sector,
    type=recipient_type,
    size=recipient_size,
    governance=recipient_governance,
    accreditation=recipient_accreditation,
    town=recipient_town,
    county=recipient_county,
    postcode=recipient_postcode,
    region=recipient_region,
    country=recipient_country
  )
actors <- rbind(senders, recipients) |>
  unique()

initial_museums <- dispersal_events |>
  select(
    museum_id=initial_museum_id,
    museum_name=initial_museum_name,
    size=initial_museum_size,
    governance=initial_museum_governance,
    governance_broad=initial_museum_governance_broad,
    subject_broad=initial_museum_subject_broad,
    subject=initial_museum_subject,
    region=initial_museum_region,
    country=initial_museum_country,
    accreditation=initial_museum_accreditation
  ) |>
  distinct() |>
  mutate(
    name=paste0(museum_name, " (", museum_id, ")")
  ) |>
  arrange(name)

collection_types <- dispersal_events |>
  mutate(
    collection_type = str_remove_all(collection_types, "\\[|\\]|'") |>
      str_split(",\\s*")
  ) |>
  unnest(collection_type) |>
  select(collection_type) |>
  unique() |>
  arrange(collection_type) |>
  filter(collection_type != "")

not_really_museums <- read_csv("data/not-really-museums.csv")

museums_including_crown_dependencies <- read_csv("data/query_results/museums.csv") |>
  filter(!museum_id %in% not_really_museums$museum_id) |>
  mutate(
    year_opened = ifelse(
      year_opened_1 == year_opened_2,
      year_opened_1,
      paste(year_opened_1, year_opened_2, sep=":")
    ),
    year_closed = case_when(
      year_closed_1 == 9999 ~ "N/A",
      year_closed_1 == year_closed_2 ~ as.character(year_closed_1),
      TRUE ~ paste(year_closed_1, year_closed_2, sep=":")
    ),
    all=factor(all, museum_attribute_ordering),
    size=factor(size, museum_attribute_ordering),
    governance=factor(governance, museum_attribute_ordering),
    governance_broad=factor(governance_broad, museum_attribute_ordering),
    subject=factor(subject, museum_attribute_ordering),
    subject_broad=factor(subject_broad, museum_attribute_ordering),
    accreditation=factor(accreditation, museum_attribute_ordering),
    region=factor(region, museum_attribute_ordering),
    country=factor(country, museum_attribute_ordering)
  )

closure_reasons <- super_events |>
  separate_rows(reason, sep = "; ") |>
  separate_wider_delim(
    reason,
    " - ",
    names=c("reason_core", "reason_core_or_child", "reason_specific"),
    too_few="align_start"
  ) |>
  mutate(
    reason_core_or_child=ifelse(
      is.na(reason_core_or_child),
      reason_core,
      paste(reason_core, "-", reason_core_or_child)
    ),
    reason_specific=ifelse(
      is.na(reason_specific),
      reason_core_or_child,
      paste(reason_core_or_child, "-", reason_specific)
    )
  ) |>
  left_join(museums_including_crown_dependencies, by="museum_id")

closure_outcomes <- get_outcomes_by_museum(super_events, dispersal_events)
closure_lengths <- get_closure_lengths_by_museum(
  super_events, dispersal_events, event_types, museums_including_crown_dependencies
)
closure_timeline_events <- get_closure_timeline_events(
  super_events, dispersal_events, event_types, museums_including_crown_dependencies
)

museums_including_crown_dependencies <- museums_including_crown_dependencies |>
  left_join(closure_outcomes, by="museum_id") |>
  left_join(
    closure_reasons |>
      select(museum_id, reasons_for_closure=super_reasons) |>
      unique(),
    by="museum_id"
  ) |>
  mutate(
    outcome_event_type=factor(outcome_event_type, museum_attribute_ordering),
    outcome_recipient_type=factor(outcome_recipient_type, museum_attribute_ordering),
    outcome_recipient_count=factor(outcome_recipient_count, museum_attribute_ordering),
    outcome_largest_share=factor(outcome_largest_share, museum_attribute_ordering),
    outcome_destination_type=factor(outcome_destination_type, museum_attribute_ordering)
  )
museums <- museums_including_crown_dependencies |>
  filter(!country %in% c("Channel Islands", "Isle of Man"))

size_labels <- museums_including_crown_dependencies |>
  select(label=size) |>
  unique() |>
  arrange(desc(label))
governance_broad_labels <- museums_including_crown_dependencies |>
  select(label=governance_broad) |>
  unique() |>
  arrange(desc(label))
governance_labels <- museums_including_crown_dependencies |>
  select(label=governance) |>
  unique() |>
  arrange(desc(label))
subject_broad_labels <- museums_including_crown_dependencies |>
  select(label=subject_broad) |>
  unique() |>
  arrange(desc(label))
subject_labels <- museums_including_crown_dependencies |>
  select(label=subject) |>
  unique() |>
  arrange(desc(label))
accreditation_labels <- museums_including_crown_dependencies |>
  select(label=accreditation) |>
  unique() |>
  arrange(desc(label))
region_labels <- museums_including_crown_dependencies |>
  select(label=region) |>
  unique() |>
  arrange(desc(label))
country_labels <- museums_including_crown_dependencies |>
  select(label=country) |>
  unique() |>
  arrange(desc(label))
reason_core_labels <- closure_reasons |>
  select(label=reason_core) |>
  unique() |>
  arrange(label)
event_core_types <- dispersal_events |>
  select(label=event_core_type) |>
  unique() |>
  arrange(label)
sender_core_types <- dispersal_events |>
  select(label=sender_core_type) |>
  unique() |>
  arrange(label)
recipient_core_types <- dispersal_events |>
  select(label=recipient_core_type) |>
  unique() |>
  arrange(label)
collection_status_labels <- dispersal_events |>
  select(label=collection_status) |>
  unique() |>
  arrange(label)

subject_labels_map <- museums_including_crown_dependencies |>
  select(subject_broad, subject) |>
  unique() |>
  arrange(desc(subject))

regions <- read_csv("data/regions.csv") |>
  mutate(group=paste(L1, L2, L3))

actor_types_csv <- "data/query_results/actor_types.csv"
actor_types <- read_csv(actor_types_csv)
 
event_types_csv <- "data/query_results/event_types.csv"
event_types <- read_csv(event_types_csv)

field_names <- data.frame(
  name=c("All", "Size", "Governance", "Accreditation", "Subject Matter", "Country/Region", "Country"),
  value=c("all", "size", "governance_broad", "accreditation", "subject_broad", "region", "country")
)
filter_field_choices <- museums_including_crown_dependencies |>
  select(all, size, governance_broad, accreditation, subject_broad, region, country) |>
  pivot_longer(
    cols=c(all, size, governance_broad, accreditation, subject_broad, region, country),
    names_to=c("field"),
    values_to=c("label")
  ) |>
  unique()

subject_filter_field_choices <- museums |>
  select(subject_broad, subject) |>
  unique() |>
  mutate(subject=fct_rev(factor(subject, levels=museum_attribute_ordering))) |>
  arrange(subject)
by_default_ignore <- c("unknown", "Unknown", "Other_Government")

sector_type_ordering_table <- actor_types |>
  mutate(
    public_proportion=public_instances / total_instances,
    private_proportion=private_instances / total_instances,
    third_proportion=third_instances / total_instances,
    university_proportion=university_instances / total_instances,
    hybrid_proportion=hybrid_instances / total_instances,
    unknown_proportion=unknown_instances / total_instances
  ) |>
  select(type_name, public_proportion, private_proportion, third_proportion, university_proportion, hybrid_proportion, unknown_proportion) |>
  bind_rows(
    tibble(
      type_name = c("public", "private", "third", "hybrid"),
      public_proportion = c(1, 0, 0, 0),
      private_proportion = c(0, 1, 0, 0),
      third_proportion = c(0, 0, 1, 0),
      university_proportion = c(0, 0, 0, 0),
      hybrid_proportion = c(0, 0, 0, 1),
      unknown_proportion = c(0, 0, 0, 0)
    )
  ) |>
  mutate(
    type_name = paste0("NA@", type_name)
  ) |>
  bind_rows(
    tibble(
      type_name = c("National@public", "National@museum", "National@organisation"),
      public_proportion = c(4, 4, 4),
      private_proportion = c(0, 0, 0),
      third_proportion = c(0, 0, 0),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Other_Government@public", "Other_Government@museum", "Other_Government@organisation"),
      public_proportion = c(3, 3, 3),
      private_proportion = c(0, 0, 0),
      third_proportion = c(0, 0, 0),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Local_Authority@public", "Local_Authority@museum", "Local_Authority@organisation"),
      public_proportion = c(2, 2, 2),
      private_proportion = c(0, 0, 0),
      third_proportion = c(0, 0, 0),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("University@university", "University@museum", "University@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(0, 0, 0),
      university_proportion = c(2, 2, 2),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Unknown@unknown", "Unknown@museum", "Unknown@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(0, 0, 0),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(2, 2, 2)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Independent@third", "Independent@museum", "Independent@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(6, 6, 6),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Independent-Not_for_profit@third", "Independent-Not_for_profit@museum", "Independent-Not_for_profit@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(6, 6, 6),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Independent-English_Heritage@third", "Independent-English_Heritage@museum", "Independent-English_Heritage@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(5, 5, 5),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Independent-National_Trust@third", "Independent-National_Trust@museum", "Independent-National_Trust@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(4, 4, 4),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Independent-National_Trust_for_Scotland@third", "Independent-National_Trust_for_Scotland@museum", "Independent-National_Trust_for_Scotland@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(3, 3, 3),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Independent-Historic_Environment_Scotland@third", "Independent-Historic_Environment_Scotland@museum", "Independent-Historic_Environment_Scotland@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(0, 0, 0),
      third_proportion = c(2, 2, 2),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  bind_rows(
    tibble(
      type_name = c("Private@private", "Private@museum", "Private@organisation"),
      public_proportion = c(0, 0, 0),
      private_proportion = c(2, 2, 2),
      third_proportion = c(0, 0, 0),
      university_proportion = c(0, 0, 0),
      hybrid_proportion = c(0, 0, 0),
      unknown_proportion = c(0, 0, 0)
    )
  ) |>
  mutate(
    ordering = public_proportion * 1e6
    + university_proportion * 1e5
    + hybrid_proportion * 1e4
    + unknown_proportion * 1e3
    + third_proportion * 1e2
    + private_proportion * 1e1
  ) |>
  arrange(ordering, desc=TRUE)

sector_type_ordering <- sector_type_ordering_table$type_name

if (FALSE) {
# script to do regional stats according to population
regional_populations <- read_csv("data/regional-populations.csv") |>
  clean_names()
print(regional_populations)
region_vs_governance_museums_summary <- museums_including_crown_dependencies |>
  get_2_way_open_and_close_data("region", "governance_broad", 2000, 2025) |>
  left_join(regional_populations, by="region") |>
  mutate(
    region=factor(region, museum_attribute_ordering),
    pop_change=pop_2023-pop_2000,
    pop_change_pc=pop_change / pop_2000 * 100,
    museums_per_capita_2000=start_total / pop_2000,
    museums_per_capita_2025=end_total / pop_2023,
    museums_per_capita_change=museums_per_capita_2025-museums_per_capita_2000,
    museums_per_capita_change_pc=round(museums_per_capita_change / museums_per_capita_2000 * 100, 1),
    museums_per_capita_2000=round(museums_per_capita_2000 * 10e5, 1),
    museums_per_capita_2025=round(museums_per_capita_2025 * 10e5, 1)
  )
regional_heatmap_2000 <- ggplot(
  region_vs_governance_museums_summary |> filter(!is.na(region), !region %in% c("all", "Channel Islands", "Isle of Man")),
  aes(
    x=region,
    y=governance_broad,
    fill=museums_per_capita_2000
    )
) +
  geom_tile(alpha=0.7, show.legend=FALSE) +
  geom_text(aes(label=museums_per_capita_2000), size=6) +
  scale_x_discrete(labels=short_labels) +
  scale_y_discrete(labels=short_labels) +
  scale_fill_gradient(low=white, high=blue) +
  labs(
    title="Museums per capita 2000",
    x="Country/Region",
    y="Governance"
  ) +
  standard_bars_theme +
  theme(
    axis.text.x=element_text(angle=45, vjust=0.5, hjust=1)
  )
ggsave("regional-heatmap-2000.png", regional_heatmap_2000, width=20, height=10, bg="white")
regional_heatmap_2025 <- ggplot(
  region_vs_governance_museums_summary |> filter(!is.na(region), !region %in% c("all", "Channel Islands", "Isle of Man")),
  aes(
    x=region,
    y=governance_broad,
    fill=museums_per_capita_2025
    )
) +
  geom_tile(alpha=0.7, show.legend=FALSE) +
  geom_text(aes(label=museums_per_capita_2025), size=6) +
  scale_x_discrete(labels=short_labels) +
  scale_y_discrete(labels=short_labels) +
  scale_fill_gradient2(low=white, high=blue) +
  labs(
    title="Museums per capita 2025",
    x="Country/Region",
    y="Governance"
  ) +
  standard_bars_theme +
  theme(
    axis.text.x=element_text(angle=45, vjust=0.5, hjust=1)
  )
ggsave("regional-heatmap-2025.png", regional_heatmap_2025, width=20, height=10, bg="white")
regional_heatmap_change <- ggplot(
  region_vs_governance_museums_summary |> filter(!is.na(region), !region %in% c("all", "Channel Islands", "Isle of Man")),
  aes(
    x=region,
    y=governance_broad,
    fill=museums_per_capita_change_pc
    )
) +
  geom_tile(alpha=0.7, show.legend=FALSE) +
  geom_text(aes(label=museums_per_capita_change_pc), size=6) +
  scale_x_discrete(labels=short_labels) +
  scale_y_discrete(labels=short_labels) +
  scale_fill_gradient2(low=red, mid=white, high=blue, midpoint=0) +
  labs(
    title="Percentage change in museums per capita 2000-2025",
    x="Country/Region",
    y="Governance"
  ) +
  standard_bars_theme +
  theme(
    axis.text.x=element_text(angle=45, vjust=0.5, hjust=1)
  )
ggsave("regional-heatmap-change.png", regional_heatmap_change, width=20, height=10, bg="white")
print(region_vs_governance_museums_summary)

# script to calculate age at time of closure
museums_with_ages <- museums_including_crown_dependencies |>
  filter(!region %in% c("Channel Islands", "Isle of Man")) |>
  mutate(
    year_of_birth = (year_opened_1 + year_opened_2) / 2,
    year_of_death = (year_closed_1 + year_closed_2) / 2,
    age_at_time_of_closure = ifelse(
      year_of_death == 9999,
      round(2025 - year_of_birth, 0),
      round(year_of_death - year_of_birth, 0)
    ),
    age_at_time_of_closure_category = case_when(
      is.na(age_at_time_of_closure) ~ NA,
      age_at_time_of_closure < 10 ~ "0-9",
      age_at_time_of_closure < 20 ~ "10-19",
      age_at_time_of_closure < 30 ~ "20-29",
      age_at_time_of_closure < 40 ~ "30-39",
      age_at_time_of_closure < 50 ~ "40-49",
      age_at_time_of_closure < 60 ~ "50-59",
      age_at_time_of_closure < 70 ~ "60-69",
      age_at_time_of_closure < 80 ~ "70-79",
      age_at_time_of_closure < 90 ~ "80-89",
      age_at_time_of_closure < 100 ~ "90-99",
      TRUE ~ "100+"
    )
  )
ages <- c(
  "0-9",
  "10-19",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60-69",
  "70-79",
  "80-89",
  "90-99",
  "100+"
)
museum_attribute_ordering <- c(museum_attribute_ordering, ages)

size_vs_age_museums_summary <- museums_with_ages |>
  get_2_way_open_and_close_data("size", "age_at_time_of_closure_category", 2000, 2025)
age_size_closures_heatmap <- ggplot(
  size_vs_age_museums_summary |> filter(!is.na(age_at_time_of_closure_category)),
  aes(
    x=age_at_time_of_closure_category,
    y=size,
    fill=closures_pc_x
    )
) +
  geom_tile(alpha=0.7, show.legend=FALSE) +
  geom_text(aes(label=closures_pc_x), size=6) +
  scale_y_discrete(labels=short_labels) +
  scale_fill_gradient2(low=white, high=red, transform="pseudo_log") +
  labs(
    title="Rowwise percentage of museum closures 2000-2025",
    x="Age at time of closure (years)",
    y="Size"
  ) +
  standard_bars_theme
ggsave("closures-age-vs-size.png", age_size_closures_heatmap, width=20, height=10, bg="white")
age_size_2025_heatmap <- ggplot(
  size_vs_age_museums_summary |> filter(!is.na(age_at_time_of_closure_category)),
  aes(
    x=age_at_time_of_closure_category,
    y=size,
    fill=end_total_pc_x
    )
) +
  geom_tile(alpha=0.7, show.legend=FALSE) +
  geom_text(aes(label=end_total_pc_x), size=6) +
  scale_y_discrete(labels=short_labels) +
  scale_fill_gradient2(low=white, high=blue, transform="pseudo_log") +
  labs(
    title="Rowwise percentage of open museums 2025",
    x="Age of museum (years)",
    y="Size"
  ) +
  standard_bars_theme
ggsave("museums-2025-age-vs-size.png", age_size_2025_heatmap, width=20, height=10, bg="white")

governance_vs_age_museums_summary <- museums_with_ages |>
  get_2_way_open_and_close_data("governance_broad", "age_at_time_of_closure_category", 2000, 2025)
age_governance_closures_heatmap <- ggplot(
  governance_vs_age_museums_summary,
  aes(
    x=age_at_time_of_closure_category,
    y=governance_broad,
    fill=closures_pc_x
    )
) +
  geom_tile(alpha=0.7, show.legend=FALSE) +
  geom_text(aes(label=closures_pc_x), size=6) +
  scale_y_discrete(labels=short_labels) +
  scale_fill_gradient2(low=white, high=red, transform="pseudo_log") +
  labs(
    title="Rowwise percentage of museum closures 2000-2025",
    x="Age at time of closure (years)",
    y="Governance"
  ) +
  standard_bars_theme
ggsave("closures-age-vs-governance.png", age_governance_closures_heatmap, width=20, height=10, bg="white")
age_governance_2025_heatmap <- ggplot(
  governance_vs_age_museums_summary,
  aes(
    x=age_at_time_of_closure_category,
    y=governance_broad,
    fill=end_total_pc_x
    )
) +
  geom_tile(alpha=0.7, show.legend=FALSE) +
  geom_text(aes(label=end_total_pc_x), size=6) +
  scale_y_discrete(labels=short_labels) +
  scale_fill_gradient2(low=white, high=blue, transform="pseudo_log") +
  labs(
    title="Rowwise percentage of open museums 2025",
    x="Age of museum (years)",
    y="Governance"
  ) +
  standard_bars_theme
ggsave("museums-2025-age-vs-governance.png", age_governance_2025_heatmap, width=20, height=10, bg="white")
}
