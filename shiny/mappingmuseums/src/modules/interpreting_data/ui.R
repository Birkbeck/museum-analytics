interpretingDataUI <- function(id) {
  fluidPage(
    text_box("
<p>The information below is intended to help users understand the scope and organisation of the data. It covers the following topics.</p>
<ul>
  <li><a href='#museum-definitions'>Museum definitions</a></li>
  <li><a href='#categorising-asset-transfers'>Categorising asset transfers and devolved museums</a></li>
  <li><a href='#categorising-relaunched-museums'>Categorising relaunched and redeveloped museums</a></li>
  <li><a href='#museum-amalgamations'>Museum amalgamations</a></li>
  <li><a href='#classifying-data'>Classifying the data</a></li>
  <li><a href='#reasons-for-closure'>Reasons for closure</a></li>
  <li><a href='#assessing-size-of-collections'>Assessing the size of collections</a></li>
  <li><a href='#collections-vs-objects'>Collections vs objects</a></li>
  <li><a href='#date-ranges'>Date ranges</a></li>
  <li><a href='#probable-and-definite-numbers'>Probable and definite numbers</a></li>
  <li><a href='#data-coverage-of-closure'>Data coverage of closure</a></li>
  <li><a href='#box-and-whisker'>Box and whisker visualisations</a></li>
</ul>"),

    HTML("

<h3 id='museum-definitions'>Museum definitions</h3>

<p>There are many ways to define museums. The museums included in this study:</p>

<ul>
  <li>care for objects in the long term</li>
  <li>have objects on display</li>
  <li>occupy a defined space with a threshold – not an exhibition in a hallway</li>
  <li>have a public orientation – so there needs to be something that invites visitors in, be it a website or a sign on the door.</li>
</ul>

<p>We have not included online, mobile, pop-up museums, or art galleries without collections.</p>
<p>We defined a museum as closed when it ceased have the characteristics listed above i.e. when it no longer cares for objects in the long term; does not display objects; loses its defined space; is not accessible to the public.</p>
<p>We have not included temporary closures, and we have recorded site rather than organisational closure. A national museum or museum service may continue to function after closing one of its branches, and a business remains operational after the museum has gone.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='categorising-asset-transfers'>Categorising asset transfers and devolved museums</h3>

<p>Many local authorities have devolved managerial responsibility for their museums to community groups or leisure management companies. The process is often referred to as asset transfer, but it rarely involves the permanent legal transfer of buildings or collections. Unless collections have been permanently transferred to another group, this study treats devolved or asset transfer museums as local authority museums.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='categorising-relaunched-museums'>Categorising relaunched and redeveloped museums</h3>

<p>In some cases, museums are replaced. It is not always easy to decide when a museum has been relaunched and when it has been so thoroughly redeveloped as to constitute a completely new entity. We considered strategic redevelopments on an individual basis. For example, Wakefield Museum and Gallery closed as part of the plan to develop Hepworth Wakefield. This involved a name change, a new building on a different site, a change in governance (the local authority devolved management responsibility to a newly established trust), and a new and more international remit. We treated this as a closure and a new museum, not as a relaunch.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='museum-amalgamations'>Museum amalgamations</h3>

<p>Amalgamations are treated as closures followed by the launch of a new museum. If one museum merges into a second, which otherwise retains its original identity, it is treated as a single closure.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='classifying-data'>Classifying the data</h3>

<p>We developed bespoke taxonomies for reasons for closure, closure events, and actors. We drew on the CIDOC Conceptual Reference Model developed by the International Committee for Documentation (part of International Council of Museums), for key distinctions concerning changes in ownership (such as sales and gifts) and custody (such as when an object is loaned or moved). Otherwise, we compiled terms and descriptions commonly found in our sources and grouped like events together. For instance, sources might cite the 2007-2009 recession, rising costs of insurance, and funding cuts as reasons for closure, which we grouped as ‘financial’, while sale of premisses, lease expired, redevelopment of site were grouped under loss of premises. For the research on museum closure, we needed to categorise closure events, reasons for closure, and actors.</p>

<p>We drew on wikidata to categorise objects. Using established categories links our research to other datasets and facilitates reuse.</p>

<p>The subject matter and size classifications were developed as part of the Mapping Museum research project conducted between 2016-2020. In the first instance, we grouped the museums in our database into recognisable categories such as ‘arts’ and ‘transport’. We devised new classes where required, and we introduced sub-categories when a single group was large and unwieldy (the exception was local history). We used more inclusive terminology than was previously the case and renamed categories that privileged particular groups or approaches (e.g. we replaced ‘military’ with ‘war and conflict’).</p>

<p>The size categories of small, medium, and large were the same as those used by the Association of Independent Museums and Arts Council England. We created the additional category of huge to distinguish museums that attract millions rather than hundreds of thousands of visitors. Each museum’s size is calculated according to the most recent number of visits that are recorded in the Mapping Museums database. When numbers were not available we used predictive testing.</p>

<p>Long-time users of Mapping Museums Lab data may notice that we have slightly altered our categories for governance. The original Mapping Museums research included privately-owned museums under the category of independent. This application treats privately-owned museums as a separate category.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='reasons-for-closure'>Reasons for closure</h3>

<p>It is usual for managing trusts or the local authority to gloss museum closure in neutral terms and to avoid controversial or damming assessments of the organisation. Similarly, they often provide a single overarching narrative, even if the actual circumstances are complex. For example, a museum may have suffered from poor transport links; non-existent marketing; high ticket prices; lack of stakeholder buy-in; problems with governance, and with staff management, the closure is presented as failure to meet visitor numbers. The information recorded in the dataset reflects the reported reasons for closure and should be taken as indicative rather than complete.</p>

<p>Where applicable and when the information is available, we have entered more than one reasons for closure per museum.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='assessing-size-of-collections'>Assessing the size of collections</h3>

<p>Modelling the numbers of objects involved in transfers, sales, and other events proved an issue for a variety of reasons:</p>

<ul>
  <li>Some objects are more thoroughly documented than others. There is more information about vehicles, especially military vehicles, than domestic objects such as vintage washing machines or blankets.</li>
  <li>Staff and volunteers made broad brush-stroke comments such as ‘most of the collection went to A, and a couple of things went to B’ or ‘Some things went to X, but the vintage tractor went to Y’.</li>
  <li>Collections substantially differ in size. ‘Some’ of the collection from a large local authority museum will probably be substantially bigger than ‘most’ of that of a small independent museum. We are not comparing like with like.</li>
  <li>Solid information on the size of a collection is rarely available</li>
  <li>In some cases, a museum’s entire collection was transferred to another institution, in others the collection was split and went in different directions. We wanted to capture all the information we possibly could, so each itemised transaction is included in our spreadsheet. The number of transactions does not equate to the number of objects or the size of the collection being moved.</li>
</ul>

<p>We have used a formula that combines the terms few, some, half, most, all with the size of the museum (according to number of visits per year) to provide an estimation of quantity. The flow lines in the figures are thicker or thinner, depending on these calculations. (the size of circles is proportional to the number of senders/recipients – when there are actors recorded as “many”, the label includes a plus sign)</p>

<p>Note: in the visualisations there are some cases of ‘all’ the collection going to one recipient and ‘some’ or a ‘few’ objects going to another.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='collections-vs-objects'>Collections vs objects</h3>

<p>Most of the data that we collected on disposal related to objects from the collections, that is to objects that had been accessioned. We have also included some data on handling objects, set dressing, gallery furniture, and other non-accessioned objects. Hence the tabs on collections disposal do include data on museum objects more broadly. Use the filters to focus your search on collections, handling objects, or non-accessioned items.</p>

<p>A museum collection often has constituent parts that may also be referred to as ‘collections’. For instance, the Museum of Domestic Design and Architecture had the Silver Studio collection, the Charles Hasler collection, and the Domestic Design collection. Sometimes a museum collection is transferred, stored, moved, or sold in its entirety. In other cases, they are split into parts. Objects may be cherry picked or packaged into groups that suit the recipients’ needs. These groups do not always align with the originating museum’s ‘collections’, hence we refer to the disposal of ‘groups of objects’, rather than to collections.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='date-ranges'>Date ranges</h3>

<p>Sometimes it was impossible to establish an exact opening or closing date for a museum, but we often had partial information: that a museum was opened in ‘the late 1980s’ or closed ‘around the millennium’. In these instances, we have used a date range, for instance a museum can be logged as having opened between 1985 and 1989, or as having closed between 2005 and 2007.</p>

<p>When calculating length of dispersal period, dates are treated as years. So the length is calculated as the distance between the year of the last event and the closure year. Where events took place within a range of years, the mid-point of that range is used. E.g an event that took place in either 2003 or 2004 is treated as taking place in 2003.5.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='probable-and-definite-numbers'>Probable and definite numbers</h3>

<p>The visualisations of museum openings and closures // in the mapping museums tabs take date ranges into account. Uncertain opening and closure dates are ‘spread’ across the range of relevant years in which they might have closed. For example, a museum which closed at some time between 2000 and 2009 contributes 0.1 closures to each of those years. The visualisations add together the number of museums that definitely opened or closed in a specified year or period together and the probable numbers of those that might have been open or closed. Numbers are rounded to the nearest whole museum.</p>

<p>There will be more museums listed in the tables than the numbers in the visualisations show because the visualisation take account of probability, while the tables list all possible museums for that category or time period.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='data-coverage-of-closure'>Data coverage of closure</h3>

<p>As of 01/07/2025 we recorded the following:</p>

<p>We collected information on collections disposal on 85% of the museums that had closed since 2000: 539 museums closed in or after 2000. We identified at least one disposal event for 448 of these museums. Eighty museums had no associated information.</p>

<p>482 museums have been given at least one reason for closure, but 10 of these are “unknown”, so 462 excluding those</p>

<p>Where possible we collected information on the location of recipients of objects from closed museums. That information was not always available, particularly when objects had been transferred to individuals or sold. Out of a total of 978 recorded recipients, 71% have some information regarding their location (ranging in granularity from country to street address). 60% have a postcode.</p>

<a href='#top'>⬆ Back to Top</a>

<h3 id='box-and-whisker'>Box and whisker visualisations</h3>

<p>Box and whisker visualisations are used in the Data collection analysis tab. These provide a simple way to show how a set of numbers is spread out. It helps you quickly see the lowest and highest numbers in the group; where the middle of the data is; whether the numbers are evenly spread or not.</p>

<p>The diagram looks like a rectangle (the ‘box’) with two lines (the ‘whiskers’) sticking out from each side.</p>

<p>Its key parts are:</p>

<ul>
  <li>Minimum – the smallest number in the data set (the left whisker ends here).</li>
  <li>First Quartile (Q1) – the first 25% of the data. This is indicated by the left hand side of the box</li>
  <li>Median (Q2) – the middle value indicated by a line inside the box.</li>
  <li>Third Quartile (Q3) – the first 75% of the data, marked by the end of the box.</li>
  <li>Maximum – the largest number in the data set, marked by the right whisker.</li>
  <li>Outliers in the data (very high or low numbers) – are shown as dots outside the whiskers.</li>
</ul>

<p>What it tells you:</p>

<ul>
  <li>If the box is small, most of the data is close together.</li>
  <li>If the box is large, the data is more spread out.</li>
  <li>If the line in the box (the median) isn’t in the centre, it means the data is skewed (more values on one side than the other).</li>
</ul>

<a href='#top'>⬆ Back to Top</a>

    ")
  )
}
