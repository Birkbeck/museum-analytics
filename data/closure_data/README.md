# Closure Data

## Data Dictionary

| **Column**           | **Description**                                                |
|----------------------|----------------------------------------------------------------|

| initial_museum_id | The Mapping Museums ID of the museum where the object(s) involved in the event originate(s). | 
| initial_museum_name | The name of the initial museum. | 
| initial_museum_size | The Mapping Museums size category of the initial museum, estimated from its yearly visitor numbers (huge, large, medium, small, unknown). | 
| initial_museum_governance | The governance category of the initial museum (national, local authority, other government, university, independent, private, unknown). | 
| initial_museum_accreditation | The accreditation status of the initial museum (accredited, unaccredited). | 
| initial_museum_subject | The subject matter category of the initial museum. | 
| initial_museum_town | The town where the initial museum was located. | 
| initial_museum_region | The country or English region where the initial museum was located. | 
| initial_museum_postcode | The postcode of the initial museum. | 
| super_event_id | Unique identifier assigned to each super-event (i.e. each museum closure). | 
| super_event_date | The year of the museum closure. | 
| super_event_reasons | A list of reasons why the museum closed (drawn from a controlled vocabulary structured into a bespoke type hierarchy – see Table 4). | 
| event_stage_in_path | The stage in the sequence of events involving the same object(s) (1 if the event is the first recorded event, 2 if it is the second, etc.). | 
| event_type | The type of event (e.g. sold-at-auction, sank). | 
| event_core_type | A more general type that the event is an instance of (e.g. sold, damaged/destroyed). | 
| event_is_end_of_existence | True if the event entailed the end of the object(s)’s existence. | 
| event_is_change_of_ownership | True if the sender gave ownership of the object(s) to the recipient. | 
| event_is_change_of_custody | True if the sender gave physical custody of the object(s) to the recipient. | 
| event_date | The date of the event (in extended date/time format) if the event happened at a point in time. | 
| event_date_from | The start date of the event (in extended date/time format) if the event took place over a period of time. | 
| event_date_to | The end date of the event (in extended date/time format) if the event took place over a period of time. | 
| previous_event_id | The ID of the immediately preceding event involving the same object(s). | 
| sender_id | The unique identifier of the actor playing the sender role in the event. | 
| sender_mm_id | The Mapping Museums ID of the sender if the sender is a known UK museum. | 
| sender_name | The name of the sender. |
| sender_type | The type of the sender. | 
| sender_core_type | A more general type that the sender is an instance of. | 
| sender_sector | The economic sector that the sender belongs to (public, private, third, university, hybrid, unknown). | 
| recipient_id | The unique identifier of the actor playing the recipient role in the event. | 
| recipient_mm_id | The Mapping Museums ID of the recipient if the recipient is a known UK museum. | 
| recipient_name | The name of the recipient. | 
| recipient_quantity | The quantity of people or organisations this actor represents (a specific number, or ‘many’) | 
| recipient_type | The type of the recipient. | 
| recipient_core_type | A more general type that the recipient is an instance of. | 
| recipient_sector | The economic sector that the recipient belongs to (public, private, third, university, hybrid, unknown). | 
| recipient_size | If the recipient is a museum in the Mapping Museums database, its size category (huge, large, medium, small, unknown) | 
| recipient_governance | If the recipient is a museum in the Mapping Museums database, its governance category (national, local authority, other government, university, independent, private, unknown) | 
| recipient_accreditation | If the recipient is a museum in the Mapping Museums database, its accreditation status (accredited, unaccredited). | 
| recipient_subject | If the recipient is a museum in the Mapping Museums database, its subject matter category | 
| recipient_town | The town where the recipient is located | 
| recipient_region | The country or English region where the recipient is located | 
| recipient_postcode | The postcode of the recipient | 
| object_id | A unique identifier assigned to the object(s) that the event involves. | 
| parent_object_id | The ID of the object(s) that the object(s) was/were previously part of. | 
| object_size | A description of the proportion of the museum’s original collection that the object(s) made up (all, most, half, some, few). | 
| object_quantity | The precise number of object(s) when known. | 
| object_status | The status of the object(s), either: collection (objects from a museum’s collection), loan (objects on loan to the museum when it closed); handling (handling objects), museum-stuff (other items such as display cases). | 
| object_types | A list of Wikidata items describing the types of object(s). | 
| object_description | An English description of the object(s). 