dataCollectionAnalysisUI <- function(id) {
  fluidPage(
    text_box(top_data),

    h3(id="eventsPerMuseumMatrixTitle", "Groups of objects recorded vs events recorded"),
    plotlyOutput(NS(id, "eventsPerMuseumMatrix"), width="80%", height="1000px"),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="eventsPerMuseumBoxplotsTitle", "Recording events per museum by subject matter"),
    p("Museums’ governance, size, and location had little impact on the amount of information that we were able to collect on collection disposal. Subject matter made a big difference to the amount of available information. Vehicles and large artillery delivery systems are often especially well documented, other objects less so. Thus, as the visualisation below shows, there tends to be more detailed information about the identity of objects from museums of transport, and of war and conflict, and the events associated with them, than about the objects from museums in most other subject categories."),
    p("The number of events that we recorded as relating to museums categorised by subject matter is shown in the visualisation below. These events include those after objects left the original museum, with later actors."),
    p("We have used a ‘box and whiskers’ visualisation that indicates the overall distribution of a set of values. The vertical line in the centre is the median value. The box contains 50% of all the values. The whiskers show values that are not outliers. The dots represent outliers. For a detailed explanation see ‘About the Data’"),
    plotlyOutput(NS(id, "eventsPerMuseumBoxplots"), width="80%", height="1000px"),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="eventsPerCollectionTitle", "Recording events by groups of objects according to subject matter"),
    p("In a few cases, the same group of objects may be associated with a sequence of events. Although we may not have detailed information on the constituent objects within the group, we may have recorded information about where that group of objects goes, for instance when it has been repeatedly transferred across institutions."),
    p("The number of sequential events that we recorded per individual group of objects for each museum categorised by subject matter is shown in the visualisation below. We have used a ‘box and whiskers’ visualisation that indicates the overall distribution of a set of values. The vertical line in the centre is the median value. The box contains 50% of all the values and the whiskers show values that are not outliers. The dots represent outliers. For a detailed explanation see ‘About the Data’."),
    plotlyOutput(NS(id, "eventsPerCollection"), width="80%", height="1000px"),
    tags$a(href = "#top", "⬆ Back to Top"),

    hr(),

    h3(id="collectionGranularityTitle", "Recording quantities of objects"),
    p("In some cases, we were able to establish approximately how many objects were involved in an event. For example, one object had been sold, one hundred objects had been loaned, one thousand objects had been transferred. In other cases, we could only record quantity as it was expressed as a proportion of the total holdings; as all, most, or some of the collection, or a few objects."),
    p("The table below shows the information recorded about the quantity of objects involved in an event. About 30% of groups of objects were given a numeric size; around 70% were assessed in relative terms."),
    plotlyOutput(NS(id, "collectionGranularity"), width="80%", height="1000px"),
    tags$a(href = "#top", "⬆ Back to Top"),

    h3(id="collectionGranularityHeatmapTitle", "Quantities of objects recorded according to subject matter"),
    p("As with the number of events recorded, the information on the size of groups of objects varied according to subject matter. Numerical values are rarely given to groups of objects from museums of the arts, of building, and rural industry. These types of objects are almost always described in relative terms: all, most, or some of the collection."),
    p("The numbers in the visualisation below are the number of groups of objects per museum (the mean). For example, on average we had data on 1.9 individual objects and 1.1 groups of between 2-10 objects for war and conflict museums."),
    plotlyOutput(NS(id, "collectionGranularityHeatmap"), width="80%", height="1000px"),
    tags$a(href = "#top", "⬆ Back to Top")

  )
}
