# micro-readweb

A universal web content reader utilizing the Pareto principle.

### Install

Clone the repository and run `npm install`.

The module installation process will automatically detect and install `PhantomJS` package, which is a headless browser toolkit. The package is self-contained for Windows and Mac OS X systems, however, for Linux system it relies on Fontconfig. Please refer to [the official document](http://phantomjs.org/download.html).

### Test & Run

To test the installation, run `npm test`.

To start the service, run `npm start`.

### Use the Service

Example:

`curl -H "Content-type:application-json" -d '{"url":"url_of_the_web_page"}' http://localhost:3000`

Options:

* `keepHref`: if `true`, the returned text will keep links in the original content.
* `paretoRatio`: a number between 0.5 and 1.0, default is 0.6.
* `timeout`: milliseconds that the reader will wait for the page to be fully loaded (such as ajax loaded content).

`curl -H "Content-type:application-json" -d '{"url":"url_of_the_web_page", "keepHref":true, "timeout": 3000}' http://localhost:3000`
