video_store <- "https://birkbeck.github.io/mm-help-videos/"
video_index_url <- paste0(video_store, "videos.yml")

get_video_meta <- function() {
  yaml::read_yaml(video_index_url)
}

get_description_html <- function(description_file, base_url = video_store) {
  md_url <- paste0(base_url, description_file)
  md_text <- tryCatch(
    readLines(md_url, warn = FALSE),
    error = function(e) return("**Error loading description**")
  )
  html <- commonmark::markdown_html(paste(md_text, collapse = "\n"))
  HTML(html)
}

helpUI <- function(id) {
  videos <- get_video_meta()

  fluidPage(
    div(
      id = "top",
      style = "padding: 30px;",

      text_box("
<p>These help videos show you how you can use this app to answer some example questions about the UK museum sector.</p>
      "),

      # Table of contents
      h3("Videos"),
      tags$ul(
        lapply(videos, function(v) {
          tags$li(
            tags$a(href = paste0("#", v$id), v$title)
          )
        })
      ),

      # Video sections
      lapply(videos, function(v) {
        description_html <- get_description_html(v$description, base_url = video_store)
        div(
          style = "width: 100%; max-width: 800px; margin-top: 40px;",
          h3(id = v$id, v$title),
          tags$video(
            src = paste0(video_store, v$video),
            type = "video/mp4",
            controls = "controls",
            width = "100%"
          ),
          HTML(description_html),
          tags$p(),
          tags$a(href = "#top", "⬆ Back to Top")
        )
      })
    )
  )
}
