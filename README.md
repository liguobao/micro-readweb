# micro-readweb

Read the main text content of a web page.

### Usage

Example:

`curl -H "Content-type:application-json" -d '{"url":"url_of_the_web_page"}' http://localhost:3000`

Options:

* `keepHref`: if `true`, the returned text will keep links in the original content.
* `paretoRatio`: a number between 0.5 and 1.0, default is 0.6.
* `timeout`: milliseconds that the reader will wait for the page to be fully loaded (such as ajax loaded content).

`curl -H "Content-type:application-json" -d '{"url":"url_of_the_web_page", "keepHref":true}' http://localhost:3000`
