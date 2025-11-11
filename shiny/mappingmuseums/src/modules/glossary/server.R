source("src/modules/glossary/elements.R")

glossaryServer <- function(id) {
  moduleServer(id, function(input, output, session) {

    output$glossaryTable <- renderDT({
      glossary_terms |>
        select(Term, Definition)
    }, options = list(pageLength = 100))

  })
}
