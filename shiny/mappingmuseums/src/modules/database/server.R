source("src/modules/database/elements.R")

databaseServer <- function(id) {
  moduleServer(id, function(input, output, session) {

    museum_ids <- read_csv("museum_ids.csv", show_col_types = FALSE)$museum_id
    X <- readMM("tfidf.mtx")
    X <- as(X, "dgCMatrix")  # efficient column-compressed
    vocab <- read_csv("vocab.csv", show_col_types = FALSE)$term
    idf <- read_csv("idf.csv", show_col_types = FALSE)$idf
    term_to_col <- setNames(seq_along(vocab), vocab)

    free_text_search <- reactive({input$freeText})
    governance_filter <- reactive({input$governanceFilter})
    size_filter <- reactive({input$sizeFilter})
    subject_filter <- reactive({input$subjectFilter})
    subject_specific_filter <- reactive({input$subjectSpecificFilter})
    accreditation_filter <- reactive({input$accreditationFilter})
    town_substring_filter <- reactive({input$townFilter})
    lad_filter <- reactive({input$ladFilter})
    region_filter <- reactive({input$regionFilter})
    opening_range_is_certain <- reactive({input$openingCertainty=="definitely"})
    opening_range_start <- reactive({input$openingStart})
    opening_range_end <- reactive({input$openingEnd})
    opening_range_is_inclusive <- reactive({input$openingInclusivity=="inclusive"})
    closing_range_is_certain <- reactive({input$closingCertainty=="definitely"})
    closing_range_start <- reactive({input$closingStart})
    closing_range_end <- reactive({input$closingEnd})
    closing_range_is_inclusive <- reactive({input$closingInclusivity=="inclusive"})

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
        session, "ladFilter", selected=lad_labels()$label
      )
      updatePickerInput(
        session, "regionFilter", selected=region_labels()$label
      )
    })

    filtered_museums <- reactive({
      # TODO: rank results by score
      if (free_text_search() == "") {
        relevant_museums <- museum_ids
      } else {
        museum_scores <- score_query(
          free_text_search(), X, museum_ids, term_to_col, idf
        ) |> filter(score > 0)
        print(museum_scores)
        relevant_museums <- museum_scores$museum_id
      }
      museums_including_crown_dependencies() |>
        filter(
          museum_id %in% relevant_museums,
          governance_broad %in% governance_filter(),
          size %in% size_filter(),
          subject_broad %in% subject_filter(),
          subject %in% subject_specific_filter(),
          accreditation %in% accreditation_filter(),
          (
            grepl(
              town_substring_filter(),
              village_town_city,
              ignore.case=TRUE
            )
            | town_substring_filter() == ""
          ),
          lad %in% lad_filter(),
          region %in% region_filter()
        ) |>
        filter_by_year(
          "opened",
          opening_range_start(),
          opening_range_end(),
          opening_range_is_certain(),
          opening_range_is_inclusive()
        ) |>
        filter_by_year(
          "closed",
          closing_range_start(),
          closing_range_end(),
          closing_range_is_certain(),
          closing_range_is_inclusive()
        )
    })

    search_results_columns <- reactive({
      mm_db_choices[mm_db_choices %in% input$tableSelect]
    })

    output$download <- downloadHandler(
      filename = function() {
        paste('mapping-museums-search-results', Sys.Date(), '.csv', sep='')
      },
      content = function(con) {
        write.csv(
          filtered_museums() |> select(all_of(search_results_columns())),
          con
        )
      },
      contentType = "text/csv"
    )

    output$searchTable <- renderDT({
      filtered_museums() |>
        select(all_of(search_results_columns()))
    }, options=list(pageLength=100, dom="liptlip"))
    # l = page length menu
    # i = info text
    # p = pagination
    # t = table
    # f = search box

  })
}
