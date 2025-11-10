glossaryUI <- function(id) {
  fluidPage(
    tagList(
      h2("Glossary"),
      p("This section provides definitions of key terms used in the analysis.")
    ),
    DTOutput(NS(id, "glossaryTable"))
  )
}
