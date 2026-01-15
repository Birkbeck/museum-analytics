databaseServer <- function(id) {
  moduleServer(id, function(input, output, session) {

    governance_filter <- reactive({input$governanceFilter})
    size_filter <- reactive({input$sizeFilter})
    subject_filter <- reactive({input$subjectFilter})
    subject_specific_filter <- reactive({input$subjectSpecificFilter})
    accreditation_filter <- reactive({input$accreditationFilter})
    town_substring_filter <- reactive({input$townFilter})
    lad_filter <- reactive({input$ladFilter})
    region_filter <- reactive({input$regionFilter})

    observeEvent(subject_filter(), {
      freezeReactiveValue(input, "subjectSpecificFilter")
      specific_subjects <- subject_labels_map() |>
        filter(subject_broad %in% subject_filter())
      updatePickerInput(
        session=session,
        inputId="subjectSpecificFilter",
        choices=specific_subjects$subject,
        selected=specific_subjects$subject,
      )
    })

    observeEvent(input$reset, {
      updatePickerInput(
        session, "governanceFilter", selected=governance_broad_labels()$label
      )
      updatePickerInput(
        session, "sizeFilter", selected=size_labels()$label
      )
      updatePickerInput(
        session, "subjectFilter", selected=subject_broad_labels()$label
      )
      updatePickerInput(
        session, "subjectSpecificFilter", selected=subject_labels()$label
      )
      updatePickerInput(
        session, "accreditationFilter", selected=accreditation_labels()$label
      )
      updateTextInput(
        session, "townFilter", value = ""
      )
      updateSelectInput(
        session, "ladFilter", selected=character(0)
      )
      updatePickerInput(
        session, "regionFilter", selected=region_labels()$label
      )
    })
      
    filtered_museums <- reactive({
      museums_including_crown_dependencies() |>
        filter(
          governance_broad %in% governance_filter(),
          size %in% size_filter(),
          subject_broad %in% subject_filter(),
          subject %in% subject_specific_filter(),
          accreditation %in% accreditation_filter(),
          grepl(
            town_substring_filter(),
            village_town_city,
            ignore.case=TRUE
          ),
          #lad %in% lad_filter_choices(),
          region %in% region_filter()
        )
    })

    search_results_columns <- c(
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
      #"local_authority_district",
      "region",
      "country",
      "year_opened",
      "year_closed"
    )

    output$searchTable <- renderDT({
      filtered_museums() |>
        select(all_of(search_results_columns))
    }, options=list(pageLength=100, dom="liptlip"))
    # l = page length menu
    # i = info text
    # p = pagination
    # t = table
    # f = search box

  })
}
