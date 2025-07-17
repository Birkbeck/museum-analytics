glossaryUI <- function(id) {
  fluidPage(
    text_box(top_glossary),

    h3(id="size", "Museum size"),
    div(
      style="text-align: left;",
      img(src='size_types.png', width="80%")
    ),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="governance", "Museum governance"),
    div(
      style="text-align: left;",
      img(src='governance_types.png', width="80%")
    ),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="subject", "Museum subject matter"),
    div(
      style="text-align: left;",
      img(src='subject_types.png', width="80%")
    ),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="reasons", "Reasons for closure"),
    div(
      style="text-align: left;",
      img(src='reason_types.png', width="80%")
    ),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="actors", "Actors involved in collection dispersal"),
    div(
      style="text-align: left;",
      img(src='actor_types.png', width="80%")
    ),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="events", "Collection dispersal events GW: or post-closure events?"),
    div(
      style="text-align: left;",
      img(src='event_types.png', width="80%")
    ),
    tags$a(href = "#top", "⬆ Back to Top")

  )
}
