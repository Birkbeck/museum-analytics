# Dispersal Sheets

This directory contains different versions of the dispersal spreadsheet `dispersal-sheet-yyyy-mm-dd.xlsx`. The dispersal sheet is an Excel file containg data concerning the flows of objects and the actors involved. This is used as input to the Neo4j database.

## Structure of The Dispersal Spreadsheet

The dispersal sheet contains a number of worksheets: `events`, `actors`, `event-types-hierarchy`, `actor-types-hierarchy`, `default-recipient-types`, `closure-causes-hierarchy`.

### The Events Sheet

The events sheet contains the following columns:

| **Column**           | **Description**                                                                                   |
|-----------------------|---------------------------------------------------------------------------------------------------|
| museum_id            | The ID of the museum in the Mapping Museums database                                              |
| museum_name            | The name of the museum in the Mapping Museums database                                              |
| **SuperEvent**        |                                                                                                   |
| super_event_type      | In all cases so far, this has been the *closure* of a museum                                      |
| super_event_id        | A unique identifier for the super event.                                                          |
| super_date      | A date in Extended Date/Time Format (EDTF) when the super event occurred.                                 | 
| super_causes   | A semi-colon separated list of the descriptions why the museum closed.                                      |
| has_collection | 'N' if the museum had no collection, blank otherwise |
| **Collection**        |                                                                                                   |
| coll_size      | Approximate proportion of the museum's total collection ('all', 'most', 'half', 'some', or 'few')       |
| object_qty      | The precise number of objects. If 1, the row refers to an object, not a collection                |
| coll_type      | A semi-colon separated list of names of Wikidata resources describing the collection contents                                   |
| coll_wiki_type_url      | A semi-colon separated list of Wikidata resources describing the collection contents                                   |
| coll_wiki_instance  | A semi-colon separated list of names of Wikidata resources of specific individual objects                                       |
| coll_wiki_instance_url  | A semi-colon separated list of Wikidata resources of specific individual objects                                       |
| coll_desc | A textual description of the collection                                                        |
| coll_status    | Whether the museum is part of the museum collection (blank) ; a loan (L); handling objects(H); or museum furniture (F)|
| collection_id        | A unique identifier for the collection or object.                                                 |
| coll_subset_of         | The ID of a super-collection that this collection was removed from                                |
| coll_contains            | The ID of a collection that is contained within this collection but has not been removed from it  |
| coll_same_as           | The ID of an identical collection that is referred to with a different ID elsewhere in the sheet  |
| coll_received_from        | The ID of a collection that was merged into this one                                              |
| **Event**             |                                                                                                   |
| event_type           | A type from the event types hierarchy                                                             |
| event_id             | A unique identifier for the event.                                                                |
| predecessor_event    | The event id of an event directly preceding this one (only used if the preceding event is not described on the row directly above) |
| event_date           | The date of the event in EDTF (if the event happens at a point in time)                           |
| event_date_from      | The start of the event in EDTF (if the event lasts for an extended period of time)                |
| event_date_to        | The end of the event in EDTF (used with Event Date From)                                          |
| actor_qty | The number of recipients in the event |
| actor_recipient_id         | The ID of the actor who receives the collection                                                   |
| actor_recipient         | The name of the actor who receives the collection                                                   |
| location                | 'stays' if the collection in an event which would usually entail movement, in this instance stayed at its origin location, blank otherwise |
| street | Address field used if the collection does not move to the location of the recipient |
| town | Address field used if the collection does not move to the location of the recipient |
| county | Address field used if the collection does not move to the location of the recipient |
| postcode | Address field used if the collection does not move to the location of the recipient |
| notes                | Additional notes relating to the event or super event                                             |

### The Actors Sheet

The actors sheet contains the following columns:

| **Column**        | **Description**                                                                                   |
|--------------------|---------------------------------------------------------------------------------------------------|
| Actor ID           | A unique identifier for the actor.                                                               |
| Actor name         | The actor's name.                                                                                |
| Actor quantity     | How many entities this actor represents.                                                         |
| Actor type         | A type from the actor types hierarchy.                                                           |
| Actor sector       | Which sector of the economy the actor belongs to.                                                |
| Museum ID          | If the actor is a UK museum, its ID in the Mapping Museums database.                             |
| Address fields     | The address of the actor, including street, city, postcode, country.                             |

### The Event Types Hierarchy

The event types sheet contains the following columns:

| **Column**              | **Description**                                                                    |
|--------------------------|-----------------------------------------------------------------------------------|
| Type name               | A descriptive name for the type.                                                   |
| Sub-type of             | The name of this type's super-type.                                                |
| Change of ownership?    | True if this type involves a transfer of legal ownership, false otherwise.         |
| Change of custody?      | True if this type involves a change of location, false otherwise.                  |
| End of existence?       | True if this type results in an object no longer existing, false otherwise.        |

### The Actor Types Hierarchy

The actor types sheet contains the following columns:

| **Column**       | **Description**                                                                      |
|-------------------|-------------------------------------------------------------------------------------|
| Type name         | A descriptive name for the type.                                                    |
| Sub-type of       | The name of this type's super-type.                                                 |
| Core category?    | True if this type is a core category, false otherwise.                              |

### The Default Recipient Types Sheet

The default recipient types sheet matches event types with default recipient actor types that should be inferred where the recipient is unknown. It contains the following columns:

| **Column**             | **Description**                                                                  |
|------------------------|----------------------------------------------------------------------------------|
| Event type             | The name of the event type.                                                      |
| Default recipient type | The name of this actor type that recipients are assumed by default to belong to. |

### The Closure Causes Hierarchy

The closure causes hierarchy maps unstructured notes in the SuperEvent Causes field onto a controlled vocabulary and hierarchy of types. It contains the following columns:

| **Column**             | **Description**                                                                          |
|------------------------|------------------------------------------------------------------------------------------|
| super cause text       | Text as it appears in the SuperEvent causes column.                                      |
| cause                  | The type from the lowest level in the closure causes hierarchy that they text maps onto. |
| cause type             | The type from the mid-level of the closure causes hierarchy.                             |
| cause super type       | The type from the top-level of the closure causes hierarchy.                             |
