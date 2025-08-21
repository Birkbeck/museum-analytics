eventsUI <- function(id) {
  fluidPage(

    text_box(top_events),
    
    sidebarLayout(
      sidebarPanel(
        width=3,
        style = sidebar_style,

        div(class="scroll-hint", "▼ Scroll for more options"),

        div(
          style = "text-align: right;",
          actionButton(NS(id, "reset"), "Reset options")
        ),

        form_subtitle("View", tooltip_view),

        form_item(
          "Y-axis",
          tooltip_main_attribute_events,
          radioButtons(
            NS(id, "yAxis"),
            label="",
            choices=c("Event", "Sender", "Recipient", "Object", "Initial museum"),
            selected="Sender",
            inline=TRUE
          )
        ),
        
        form_item(
          "X-axis",
          tooltip_secondary_attribute_events,
          radioButtons(
            NS(id, "xAxis"),
            label="",
            choices=c("Event", "Sender", "Recipient", "Object", "Initial museum"),
            selected="Event",
            inline=TRUE
          )
        ),
        
        form_item(
          "Display",
          tooltip_steps_or_last,
          radioButtons(
            NS(id, "stepsOrLast"),
            label="",
            choices=c("Stepwise events", "Last known event"),
            selected="Stepwise events",
            inline=TRUE
          )
        ),

        form_item(
          "Steps in path",
          tooltip_stepwise_events,
          pickerInput(
            NS(id, "stagesInPath"),
            "",
            choices=c(),
            selected=c(),
            options=pickerOptions(
              actionsBox=TRUE,
              size=10,
              selectedTextFormat="count > 7"
            ),
            multiple=TRUE
          )
        ),

        form_item(
          "Counts or percentages",
          tooltip_count_or_percentage_events,
          radioButtons(
            inputId = NS(id, "countOrPercentage"),
            label = "",
            choices = list(
              "Show number of events" = "count",
              "Show percentage of events" = "percentage",
              "Show rowwise percentages" = "percentage_rowwise",
              "Show columnwise percentages" = "percentage_columnwise"
            )
          )
        ),

        form_item(
          "Events - level of detail",
          tooltip_group_events_level,
          radioButtons(
            NS(id, "eventGrouping"),
            label="",
            choices=c("Core categories", "Most specific"),
            selected="Core categories",
            inline=TRUE
          )
        ),

        form_item(
          "Actors - level of detail",
          tooltip_group_actors_level,
          radioButtons(
            NS(id, "actorGrouping"),
            label="",
            choices=c("Core categories", "Most specific"),
            selected="Core categories",
            inline=TRUE
          )
        ),
        
        form_item(
          "Museums attribute",
          tooltip_group_museums_by,
          radioButtons(
            NS(id, "museumGrouping"),
            label="",
            choices=field_names$name,
            selected="Governance"
          )
        ),
        
        form_subtitle("Filter", tooltip_filter),

        tags$details(
          tags$summary("Events"),
          form_item(
            "Event",
            tooltip_event_types,
            pickerInput(
              NS(id, "eventTypeFilter"), 
              "",
              choices=c(),
              selected=c(),
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            ) 
          )
        ),
        
        tags$details(
          tags$summary("Actors"),
          form_item(
            "Sender",
            tooltip_sender_types,
            pickerInput(
              NS(id, "senderTypeFilter"), 
              "",
              choices=c(),
              selected=c(),
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            ) 
          ),
          form_item(
            "Recipient",
            tooltip_recipient_types,
            pickerInput(
              NS(id, "recipientTypeFilter"), 
              "",
              choices=c(),
              selected=c(),
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            ) 
          )
        ),
        
        tags$details(
          tags$summary("Objects"),
          form_item(
            "Object",
            tooltip_collection_type,
            pickerInput(
              NS(id, "collectionTypeFilter"), 
              "",
              choices=collection_types$collection_type,
              selected=collection_types$collection_type,
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            ) 
          ),
          form_item(
            "Object status",
            tooltip_collection_status,
            pickerInput(
              NS(id, "collectionStatusFilter"), 
              "",
              choices=collection_status_labels$label,
              selected=collection_status_labels$label,
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            ) 
          )
        ),
        
        tags$details(
          tags$summary("Initial museum"),
          form_item(
            "Initial museum governance",
            tooltip_museum_governance,
            pickerInput(
              NS(id, "governanceFilter"), 
              "",
              choices=governance_broad_labels$label,
              selected=governance_broad_labels$label,
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            ) 
          ),
          
          form_item(
            "Initial museum size",
            tooltip_museum_size,
            pickerInput(
              NS(id, "sizeFilter"), 
              "",
              choices=size_labels$label,
              selected=size_labels$label,
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            ) 
          ),
          
          form_item(
            "Initial museum subject",
            tooltip_museum_subject,
            pickerInput(
              NS(id, "subjectFilter"), 
              "",
              choices=subject_broad_labels$label,
              selected=subject_broad_labels$label,
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            )  
          ),
          
          form_item(
            "Initial museum subject (specific)",
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
          
          form_item(
            "Initial museum location",
            tooltip_museum_country_region,
            pickerInput(
              NS(id, "regionFilter"), 
              "",
              choices=region_labels$label,
              selected=region_labels$label,
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            )   
          ),
          
          form_item(
            "Initial museum accreditation",
            tooltip_museum_accreditation,
            pickerInput(
              NS(id, "accreditationFilter"), 
              "",
              choices=accreditation_labels$label,
              selected=accreditation_labels$label,
              options=pickerOptions(
                actionsBox=TRUE, 
                size=10,
                selectedTextFormat="count > 3"
              ), 
              multiple=TRUE
            )   
          )
        )
        
      ),
      
      mainPanel(
        uiOutput(NS(id, "errorMessage")),
        withSpinner(
          plotlyOutput(NS(id, "mainPlot"), width="100%", height="1200px")
        )
      )
    ),
    
    fluidRow(
      h3("Events Involving Museum Collections"),
      virtualSelectInput(
        NS(id, "tableSelect"),
        label="show columns:",
        choices=events_table_choices,
        selected=events_table_selected,
        multiple=TRUE,
        disableSelectAll=FALSE,
        search=TRUE
      ),
      downloadButton(NS(id, "downloadEventsTable"), label="Download table as CSV")
    ),
    fluidRow(
      DTOutput(NS(id, "eventsTable"))
    )
  )
}
