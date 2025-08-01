dataCollectionUI <- function(id) {
  fluidPage(
    div(
      style="padding: 30px;",
      p(style=explanation_para, "Data Collection has occurred in two main phases. For the original Mapping Museums project, which ran from 2016-2020, we collected information on all the museums open in the UK between 1960 and 2020. We logged their address, governance, size, and subject matter, accreditation status, years of opening and, if relevant, closure. Our information came from the following sources:"),
      tags$ul(
        tags$li("Arts Council England list of accredited museums 2017"),
        tags$li("Association of Independent Museums members list 2016"),
        tags$li("Association of Independent Museums members list 1982"),
        tags$li("Association of Independent Museums non-members list 1982"),
        tags$li("AMOT Guide to Military Museums in the UK 2010/2011"),
        tags$li("Digest of Museum Statistics 1998"),
        tags$li("Historic Houses Association Friends Pocket Guide 2016"),
        tags$li("Historic Houses & Castles in Great Britain and Northern Ireland, London: Index Publishers 1959"),
        tags$li("Kenneth Hudson and Ann Nicholls, The Directory of Museums and Living Displays, London: Macmillan 1985"),
        tags$li("Micromuseums Archive, Bishopsgate Institute, London"),
        tags$li("Museum and Libraries Division, Wales. Raw data from ‘Spotlight’ reports, 2002, and published data 2007, 2013, 2015"),
        tags$li("Museums and Galleries Scotland museums list 2016"),
        tags$li("Northern Ireland Museums Council, museum list, 2012, 2016"),
        tags$li("Museum Association ‘Find a Museum’ website 2017"),
        tags$li("Museums Association’s Museums Calendar 1970"),
        tags$li("Scottish Museums Council, A Collective Insight: Scotland’s National Audit; full findings report 2002."),
        tags$li("Standing Commission on Museums and Galleries, Survey of Provincial Museums, 1963"),
        tags$li("Wikipedia lists of museums by country/county")
      ),
      p(style=explanation_para, "Since then, we have continued to check for new and closed museums and to update the database accordingly. Our new information has come from four main sources"),
      tags$ul(
        tags$li("Museums Journal news and announcements"),
        tags$li("Google alerts and online searches"),
        tags$li("Regular communication with Museums Development Network"),
        tags$li("Direct contact with museum staff")
      ),
      p(style=explanation_para, "The updated Mapping Museums database provided the basis for our study of closure."),
      p(style=explanation_para, "For the Museum Closure project, which ran between 2023-25, we collected additional data on why museums had closed and on what had happened to the collections. Wherever possible we collected information on who had acquired collections, under what circumstances, when, and the objects’ new locations, if relevant. We found our information from the following sources:"),
      tags$ul(
        tags$li("Local and national newspapers"),
        tags$li("Subject specialist journals"),
        tags$li("Charity commission records"),
        tags$li("Closed museums’ websites (extant and via Wayback machine)"),
        tags$li("Defunct and current social media"),
        tags$li("Online reviews, blogs, and chat forums")
      ),
      p(style=explanation_para, "We followed leads by email and telephone, contacting former volunteers, members of staff, and family members as appropriate. We also put out calls for help via social media and contacted staff in:"),
      tags$ul(
        tags$li("Subject specialist networks"),
        tags$li("Enthusiast, preservation, and historical societies"),
        tags$li("Local councils"),
        tags$li("Museum services"),
        tags$li("Neighbouring museums"),
        tags$li("Neighbouring businesses"),
        tags$li("Tourist offices")
      ),
      p(style=explanation_para, "The material was cross-checked within the research team. Staff from each of the Museums Development Networks reviewed and helped refine our lists of closed museums.")
    )
  )
}
