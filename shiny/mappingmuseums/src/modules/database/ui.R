db_tooltip_search <- "Enter free text to search all fields of the Mapping Museums database"

tooltip_village_town_city <- "The village, town, or city where the museum is located."
tooltip_local_authority_district <- "The local authority district (20xx) where the museum is located."

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

    tags$details(
      tags$summary("Advanced filters"),

      hr(),
  
      h4("Museum attributes"),
  
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
      ),
  
      hr(),
  
      h4("Museum location"),
  
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
          choices=NULL,
          selected=NULL,
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
      ),
  
      hr(),
  
      h4("Time period"),
  
      tags$div(
        style = "display: flex; align-items: flex-end; gap: 8px;",
        p("Show museums that"),
        selectInput(
          NS(id, "openingCertainity"),
          "",
          choices=c("definitely", "possibly"),
          selected="possibly",
          multiple=FALSE,
          width=120
        ),
        p("opened between"),
        selectInput(
          NS(id, "openingStart"),
          "",
          choices=c("pre-1960", seq(1960, 2025, by=1)),
          selected="pre-1960",
          multiple=FALSE,
          width=120
        ),
        p("and"),
        selectInput(
          NS(id, "openingEnd"),
          "",
          choices=c("pre-1960", seq(1960, 2025, by=1)),
          selected="2025",
          multiple=FALSE,
          width=120
        ),
        selectInput(
          NS(id, "openingInclusivity"),
          "",
          choices=c("inclusive", "exclusive"),
          selected="inclusive",
          multiple=FALSE,
          width=120
        )
      ),
  
      tags$div(
        style = "display: flex; align-items: flex-end; gap: 8px;",
        p("Show museums that"),
        selectInput(
          NS(id, "closingCertainity"),
          "",
          choices=c("definitely", "possibly"),
          selected="possibly",
          multiple=FALSE,
          width=120
        ),
        p("closed between"),
        selectInput(
          NS(id, "closedStart"),
          "",
          choices=c("never", "pre-1960", seq(1960, 2025, by=1)),
          selected="pre-1960",
          multiple=FALSE,
          width=120
        ),
        p("and"),
        selectInput(
          NS(id, "closedEnd"),
          "",
          choices=c("never", "pre-1960", seq(1960, 2025, by=1)),
          selected="never",
          multiple=FALSE,
          width=120
        ),
        selectInput(
          NS(id, "closingInclusivity"),
          "",
          choices=c("inclusive", "exclusive"),
          selected="inclusive",
          multiple=FALSE,
          width=120
        )
      ),
  
    ),

    hr(),

    br(),

    actionButton(NS(id, "reset"), "Reset"),

    p(""),
    hr(),

    DTOutput(NS(id, "searchTable"))

  )
}
