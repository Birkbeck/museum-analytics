make_query_vec <- function(query, term_to_col, idf, ncol_X) {
  # TODO: preferably use stemming (here and in python code)
  q <- tolower(query)
  tokens <- unlist(strsplit(gsub("[^a-z0-9 ]+", " ", q), "\\s+"))
  tokens <- tokens[nzchar(tokens)]

  cols <- term_to_col[tokens]
  cols <- cols[!is.na(cols)]
  if (!length(cols)) return(sparseVector(length = ncol_X))

  tab <- table(cols)
  j <- as.integer(names(tab))
  tf <- as.numeric(tab)

  x <- tf * idf[j]

  # L2 normalize
  norm <- sqrt(sum(x^2))
  if (norm > 0) x <- x / norm

  sparseVector(i = j, x = x, length = ncol_X)
}

score_query <- function(query, X, museum_ids, term_to_col, idf) {
  qv <- make_query_vec(query, term_to_col, idf, ncol(X))
  if (length(qv@x) == 0) {
    return(tibble::tibble(museum_id = museum_ids, score = 0))
  }

  # cosine similarity: X %*% qv
  s <- as.numeric(X %*% qv)

  tibble::tibble(museum_id = museum_ids, score = s) |>
    dplyr::arrange(dplyr::desc(score))
}

filter_by_opening <- function(df, start, end, certain, inclusive) {
  convert_to_truncated_timescale <- function(year) {
    ifelse(year < 1960, 1959, year)
  }
  if (start == "pre-1960") {
    start <- 1959
  } else {
    start <- as.numeric(start)
  }
  if (end == "pre-1960") {
    end <- 1959
  } else {
    end <- as.numeric(end)
  }
  if (inclusive) {
    ordering_operator <- `<=`
  } else {
    ordering_operator <- `<`
  }
  if (certain) {
    combination_operator <- `&`
  } else {
    combination_operator <- `|`
  }
  print(ordering_operator)
  print(combination_operator)
  print(start)
  print(end)
  df |>
    mutate(
      yo1=convert_to_truncated_timescale(year_opened_1),
      yo2=convert_to_truncated_timescale(year_opened_2)
    ) |>
    filter(
      combination_operator(
        ordering_operator(start, yo1) & ordering_operator(yo1, end),
        ordering_operator(start, yo2) & ordering_operator(yo2, end)
      )
    ) |>
    select(-yo1, -yo2)
} 

filter_by_year <- function(df, event_type, start, end, certain, inclusive) {
  convert_to_truncated_timescale <- function(year) {
    ifelse(year < 1960, 1959, year)
  }
  if (start == "pre-1960") {
    start <- 1959
  } else if (start == "never") {
    start <- 9999
  } else {
    start <- as.numeric(start)
  }
  if (end == "pre-1960") {
    end <- 1959
  } else if (end == "never") {
    end <- 9999
  } else {
    end <- as.numeric(end)
  }
  if (inclusive) {
    ordering_operator <- `<=`
  } else {
    ordering_operator <- `<`
  }
  if (certain) {
    combination_operator <- `&`
  } else {
    combination_operator <- `|`
  }
  df |>
    mutate(
      yo1=convert_to_truncated_timescale(.data[[paste("year", event_type, "1", sep="_")]]),
      yo2=convert_to_truncated_timescale(.data[[paste("year", event_type, "2", sep="_")]]),
    ) |>
    filter(
      combination_operator(
        ordering_operator(start, yo1) & ordering_operator(yo1, end),
        ordering_operator(start, yo2) & ordering_operator(yo2, end)
      )
    ) |>
    select(-yo1, -yo2)
} 
