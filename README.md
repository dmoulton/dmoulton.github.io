# My Personal Website

Many thanks Olivier Pieters for providing an elegant way to create a gallery in Jekyll. This started with his example and has a few additions of mine that are specific to my own needs. Feel free to use this as an example for yourself.

To add a new image to a gallery, create two images in the assets/messier, or assets/whatever directory. One is the full sized image, titled <whatever>-large.jpg, and the other a smaller thumbnail 300 pixels wide with the name <whatever>-thumb.jpg. Then run the script located at https://gist.github.com/dmoulton/0d9ce1da1a60a0e991e0a497a7ee5b5b. You will need to verify that the directories that are in that script are what you need for the particular gallery that you are creating or updating. The script is geared towards messier objects, and will need modifications to create other images.

You can run the script from the _data/galleries directory and then it will automatically replace the yaml file. Otherwise, you will need to copy in the file that it creates.

The rest of this is the original readme for reference.

## Installing

1. Clone the git repo: `git clone https://github.com/opieters/jekyll-image-gallery-example.git`
2. Change folder: `cd jekyll-image-gallery-example`
3. Install Jekyll: `gem install jekyll`

## Run the Website and Make It Your Own

Run the website with `jekyll s`. Or just view the [GitHub Pages version](https://opieters.github.io/jekyll-image-gallery-example/). To [view the gallery](https://opieters.github.io/jekyll-image-gallery-example/photography/) click on the photography menu item.

[This blogpost](http://www.olivierpieters.be/blog/2016/02/26/creating-a-jekyll-image-gallery.html) explains different parts of the gallery and design choices. Use this guide and the files in this repo to make your own photo gallery.

## License

The code is licensed under MIT license (see LICENSE-CODE.md). The images in the `assets/photography` folder are licensed under CC-BY-NC-SA license (see LICENSE-IMAGES.md).
