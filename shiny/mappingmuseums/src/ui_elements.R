text_box <- function(text) {
  tags$div(
    style = "background-color: #f0f0f0;
padding: 20px;
border-style: solid;
border-radius: 20px;
border-width: 10px;
border-color: #ffffff;
margin-top: 20px;
width:100%;
max-width:800px",
    HTML(text)
  )
}

explanation_para <- "width: 100%; max-width: 800px;"

sidebar_style <- "height: 95vh; overflow-y: auto;"
 
popover_js <- HTML("
$(document).ready(function() {
  $('[data-toggle=\"popover\"]').popover({
    trigger: 'hover', // Show on hover
    container: 'body', // Attach to body to avoid layout issues
    html: true
  });
});")

form_subtitle <- function(title, content) {
  tagList(
    tags$div(
      tags$h3(
        style = "display: inline-block; margin-right: 8px;",
        title
      ),
      tags$span(
        tags$i(
          class = "fa fa-info-circle",
          style = "color: #007bff; cursor: pointer; vertical-align: middle;",
          `data-toggle` = "popover",
          `data-placement` = "right",
          title = title,
          `data-content` = content
        )
      )
    ),
    tags$script(popover_js)
  )
}

form_item <- function(title, content, item) {
  tagList(
    tags$span(
      tags$strong(paste0(title, ":")),
      tags$i(
        class = "fa fa-info-circle",
        style = "color: #007bff; cursor: pointer;",
        `data-toggle` = "popover",
        `data-placement` = "right",
        title = title,
        `data-content` = content
      )
    ),
    tags$script(popover_js),
    item
  )
}
