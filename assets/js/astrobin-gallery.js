// Create a request variable and assign a new XMLHttpRequest object to it.
var request = new XMLHttpRequest()

const app = document.getElementById('root')


// Open a new connection, using the GET request on the URL endpoint
request.open('GET', 'https://www.astrobin.com/api/v1/image/?user=dmoulton&api_key=2c284ca6393ceb538d753cb307b7dd8eb2b41144&api_secret=c5637a20035f8ab070e38cc0171cd47dd164a76d&format=json', true)

request.onload = function () {
  // Begin accessing JSON data here
  var data = JSON.parse(this.response)

  if (request.status >= 200 && request.status < 400) {
    data['objects'].forEach((image) => {
      if (!image.hash) {
          ident = image.id
      } else {
          ident = image.hash
      }
      console.log(image.url_regular)

      responsive_container = document.createElement('div')
      responsive_container.setAttribute('class', 'responsive')
      app.appendChild(responsive_container)

      gallery_container = document.createElement('div')
      gallery_container.setAttribute('class', 'gallery')
      responsive_container.appendChild(gallery_container)

      i = document.createElement('img')
      i.src = image.url_regular

      imgLink = document.createElement('a')
      imgLink.setAttribute('href', `http://astrobin.com/${ident}`)
      imgLink.setAttribute('target', "_astrobin")
      imgLink.appendChild(i)

      gallery_container.appendChild(imgLink)

      textLink = document.createElement('a')
      textLink.setAttribute('href',`http://astrobin.com/${ident}`)
      textLink.setAttribute('target', "_astrobin")
      textLink.innerText=image.title
    

      title = document.createElement('div')
      title.setAttribute('class', 'desc')
      title.appendChild(textLink)

      gallery_container.appendChild(title)
    })
  } else {
    console.log('error')
  }
}

// Send request
request.send()
