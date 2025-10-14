# Data Model

This directory contains files which describe the data model developed by our research project.

## Files

- `data-model.xlsx` The entities, relations, and their attributes used in our graph database of museum object flows
- `actor_types.csv` The taxonomy of actor types involved in collection dispersal. Each row defines an actor type with name `type_name` whose parent type is found in the `sub_type_of` column.
- `event_types.csv` The taxonomy of event types involved in collection dispersal. Each row defines an event type with name `type_name` whose parent type is found in the `sub_type_of` column.
- `reason_types.csv` The taxonomy of reasons for museum closure.
- `governance_types.csv` The governance categories that museums belong to.
- `size_types.csv` The size categories that museums belong to.
- `subject_types.csv` The subject matter categories that museums belong to.

## Dictionary

The tables in the files contain the follow field names:

## Data Model - Entities

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| Class                  | A descriptive name for the entity type.                                           |
| Description            | A description of the entity type.                                                 |

## Data Model - Entity Attributes

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| Class                  | The name of the entity type that the attribute belongs to.                        |
| Attribute              | The name of the attribute.                                                        |
| Data type              | The data type of the attribute.                                                   |
| Description            | A description of the attribute.                                                   |

## Data Model - Relations

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| Relation               | The name of the relation type.                                                    |
| From                   | The entity type that relations of this type start from.                           |
| To                     | The entity type that relations of this type end at.                               |
| Description            | A description of the relation type.                                               |

### Actor Types

Actors invovled in the dispersal of museum objects.

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| type_name              | A descriptive name for the type.                                                  |
| sub_type_of            | The name of this type's super-type.                                               |
| is_core_category       | True if this type should be treated as a core category (neither highly specific nor highly generic) |

### Event Types

Events involving objects from closed museums.

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| type_name              | A descriptive name for the type.                                                  |
| sub_type_of            | The name of this type's super-type.                                               |
| definition             | The defition of this type.                                                        |
| is_core_category       | True if this type should be treated as a core category (neither highly specific nor highly generic) |
| change_of_ownership    | True if this type involves a transfer of legal ownership, false otherwise.        |
| change_of_custody      | True if this type involves a change of location, false otherwise.                 |
| end_of_existence       | True if this type results in an object no longer existing, false otherwise.       |

### Reason Types

Reasons why a museum closed.

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| type_name              | A descriptive name for the type.                                                  |
| sub_type_of            | The name of this type's super-type.                                               |
| is_core_category       | True if this type should be treated as a core category (neither highly specific nor highly generic |

### Governance Types

Values that can be used to describe the governance of a museum.

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| type_name              | A descriptive name for the type.                                                  |
| sub_type_of            | The name of this type's super-type.                                               |
| is_broad               | True if this type is used at a more general level of abstraction.                 |

### Size Types

Values that can be used to describe the size of a museum (estimated from the museum's visitor numbers).

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| type_name              | A descriptive name for the type.                                                  |
| sub_type_of            | The name of this type's super-type.                                               |
| definition             | The range of annual visitor numbers this category corresponds to.                 |


### Subject Types

Values that can be used to describe the subject matter covered by a museum.

| **Field name**         | **Description**                                                                   |
|------------------------|-----------------------------------------------------------------------------------|
| type_name              | A descriptive name for the type.                                                  |
| sub_type_of            | The name of this type's super-type.                                               |
| is_broad               | True if this type is used at a more general level of abstraction.                 |



