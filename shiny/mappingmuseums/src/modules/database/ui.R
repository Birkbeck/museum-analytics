db_tooltip_search <- "Enter free text to search all fields of the Mapping Museums database"

tooltip_village_town_city <- "The village, town, or city where the museum is located."
tooltip_local_authority_district <- "The local authority district (2023 boundaries) where the museum is located."
tooltip_existence_or_open_close <- "Filter museums according to when they were open (they had opened before the start of the time period and closed during or after the time period) or according to their opening and closure dates (specify the time period during which their opening occurred and the time period during which their closure occurred)."
tooltip_show_columns <- "Select which columns should appear in the results table."

mm_db_choices <- c(
  "museum_id",
  "museum_name",
  "governance_broad",
  "governance",
  "size",
  "subject_broad",
  "subject",
  "accreditation",
  "address_1",
  "address_2",
  "address_3",
  "village_town_city",
  "postcode",
  "lad",
  "region",
  "country",
  "year_opened",
  "year_closed",
  "notes"
)

mm_db_selected <- c(
  "museum_id",
  "museum_name",
  "governance_broad",
  "governance",
  "size",
  "subject",
  "accreditation",
  "address_1",
  "address_2",
  "address_3",
  "village_town_city",
  "postcode",
  "lad",
  "region",
  "country",
  "year_opened",
  "year_closed",
  "notes"
)

databaseUI <- function(id) {

  fluidPage(
    text_box(top_database),

    search_form_item(
      "Search",
      db_tooltip_search,
      textInput(
        NS(id, "freeText"),
        label="",
        value=""
      )
    ),

    h3("Advanced Filters"),

    hr(),

    tags$details(
      tags$summary("Museum attributes"),
  
      search_form_item(
        "Governance",
        tooltip_museum_governance,
        pickerInput(
          NS(id, "governanceFilter"), 
          "",
          choices=governance_broad_labels()$label,
          selected=governance_broad_labels()$label,
          options=pickerOptions(
            actionsBox=TRUE, 
            size=10,
            selectedTextFormat="count > 3"
          ), 
          multiple=TRUE
        ) 
      ),
      
      search_form_item(
        "Museum size",
        tooltip_museum_size,
        pickerInput(
          NS(id, "sizeFilter"), 
          "",
          choices=size_labels()$label,
          selected=size_labels()$label,
          options=pickerOptions(
            actionsBox=TRUE, 
            size=10,
            selectedTextFormat="count > 3"
          ), 
          multiple=TRUE
        ) 
      ),
      
      search_form_item(
        "Museum subject",
        tooltip_museum_subject,
        pickerInput(
          NS(id, "subjectFilter"), 
          "",
          choices=subject_broad_labels()$label,
          selected=subject_broad_labels()$label,
          options=pickerOptions(
            actionsBox=TRUE, 
            size=10,
            selectedTextFormat="count > 3"
          ), 
          multiple=TRUE
        )  
      ),
      
      search_form_item(
        "Museum subject (specific)",
        tooltip_museum_subject_specific,
        pickerInput(
          NS(id, "subjectSpecificFilter"), 
          "",
          choices=NULL,
          selected=NULL,
          options=pickerOptions(
            actionsBox=TRUE, 
            size=10,
            selectedTextFormat="count > 3"
          ), 
          multiple=TRUE
        )
      ),
      
      search_form_item(
        "Museum accreditation",
        tooltip_museum_accreditation,
        pickerInput(
          NS(id, "accreditationFilter"), 
          "",
          choices=accreditation_labels()$label,
          selected=accreditation_labels()$label,
          options=pickerOptions(
            actionsBox=TRUE, 
            size=10,
            selectedTextFormat="count > 3"
          ), 
          multiple=TRUE
        )   
      )
    ),
  
    hr(),

    tags$details(
      tags$summary("Museum location"),
  
      search_form_item(
        "Village / Town / City",
        tooltip_village_town_city,
        textInput(
          NS(id, "townFilter"), 
          label="",
          value=""
        ) 
      ),
  
      search_form_item(
        "Local Authority District",
        tooltip_local_authority_district,
        virtualSelectInput(
          NS(id, "ladFilter"),
          "",
          choices=lad_labels()$label,
          selected=lad_labels()$label,
          multiple=TRUE,
          disableSelectAll=FALSE,
          search=TRUE
        )
      ),
  
      search_form_item(
        "Region",
        tooltip_museum_country_region,
        pickerInput(
          NS(id, "regionFilter"), 
          "",
          choices=region_labels()$label,
          selected=region_labels()$label,
          options=pickerOptions(
            actionsBox=TRUE, 
            size=10,
            selectedTextFormat="count > 3"
          ), 
          multiple=TRUE
        )   
      )
    ),
  
    hr(),
  
    tags$details(
      tags$summary("Time period"),

      search_form_item(
        "Filter by",
        tooltip_existence_or_open_close,
        radioButtons(
          NS(id, "existenceOrOpenClose"),
          label="",
          choices=c(
            "Museums that were open in time period",
            "Museum opening and closure dates"
          ),
          selected="Museums that were open in time period",
          inline=FALSE
        )
      ),

      uiOutput(NS(id, "timePeriodSearch"))

    ),

    hr(),

    br(),

    actionButton(NS(id, "reset"), "Reset filters"),

    search_form_item(
      "Show columns",
      tooltip_show_columns,
      virtualSelectInput(
        NS(id, "tableSelect"),
        label="",
        choices=mm_db_choices,
        selected=mm_db_selected,
        multiple=TRUE,
        disableSelectAll=FALSE,
        search=TRUE
      )
    ),

    downloadButton(NS(id, "download"), label="Download table as CSV"),

    p(""),
    hr(),

    DTOutput(NS(id, "searchTable"))

  )
}
