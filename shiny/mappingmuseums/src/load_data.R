set.seed(1)

drive_url <- "https://drive.google.com/uc?export=download&id="
super_events_file_id <- "13YFfwAtXzYbFCJaDhokDRVNk0EYyb7hn"
actor_types_file_id <- "1Q7aqbhHdv_FZO23okdbF4fesGe6i0B8A"
event_types_file_id <- "1Muwm6O8sBxcdUoY3wo4ohjSRKN8r5oft"
dispersal_events_file_id <- "1EbmJT1OgGRsV_PQ8l9xLSORHPodKAUum"
museums_file_id <- "1VipAgQDuYNQAhG5uXYEiZfKMf5oCJ5cJ"

super_events_url <- paste0(drive_url, super_events_file_id)
actor_types_url <- paste0(drive_url, actor_types_file_id)
event_types_url <- paste0(drive_url, event_types_file_id)
dispersal_events_url <- paste0(drive_url, dispersal_events_file_id)
museums_url <- paste0(drive_url, museums_file_id)

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

super_events <- read_csv(super_events_url)

event_types <- read_csv(event_types_url)

dispersal_events <- read_csv(dispersal_events_url) |>
  mutate(
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

museums_including_crown_dependencies <- read_csv(museums_url) |>
  filter(!museum_id %in% not_really_museums$museum_id) |>
  mutate(
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

actor_types <- read_csv(actor_types_url)
 
event_types <- read_csv(event_types_url)

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
