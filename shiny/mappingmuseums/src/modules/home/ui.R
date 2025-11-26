homeUI <- function(id) {

  fluidPage(
    text_box(top_home),

    div(
      style="padding: 30px;",
      p("The data is free to use. Please credit the Mapping Museums Lab as the source."),
      p("Click on the buttons below to download the data in csv format."),
      downloadButton(NS(id, "downloadMuseumsTable"), label="Download all Mapping Museums data"),
      downloadButton(NS(id, "downloadEventsTable"), label="Download all dispersal data"),
      downloadButton(NS(id, "downloadActorsTable"), label="Download all actors' data"),
      p(""),
      p(
        HTML(
          "Please send updates or additions to the data to <a href='mailto:mappingmuseums@bbk.ac.uk'>mappingmuseums@bbk.ac.uk</a>."
        )
      )
    ),


    text_box("<p>This application was designed and developed by the <a href='https://mapping-museums.bbk.ac.uk/', target='_blank'>Mapping Museums Lab</a>, a multi-disciplinary research group based at Birkbeck, University of London, and King’s College London. It includes data collected during our first research project <a href='https://mapping-museums.bbk.ac.uk/about-mapping-museums/', target='_blank'>‘Mapping Museums in the UK 1960-2020’</a>, and from our more recent project <a href='https://mapping-museums.bbk.ac.uk/museum-closure-in-the-uk-2000-2025/', target='_blank'>‘Museum Closure in the UK 2000-25'</a>. Both projects were supported by the Arts and Humanities Research Council.</p>")
  )
}
