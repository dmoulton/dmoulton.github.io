# My Personal Website

Many thanks Olivier Pieters for providing an elegant way to create a gallery in Jekyll. This started with his example and has a few additions of mine that are specific to my own needs. Feel free to use this as an example for yourself.

## Dev Container

This is much easier to keep running on multiple dev machines if you use a docker conainer. This project has a .devconainer 
directory so that it can be run with vscode and docker.

## Run the Website and Make It Your Own

Run the website with ` bundle exec jekyll s`. Or just view the [GitHub Pages version](https://opieters.github.io/jekyll-image-gallery-example/). To [view the gallery](https://opieters.github.io/jekyll-image-gallery-example/photography/) click on the photography menu item.

[This blogpost](http://www.olivierpieters.be/blog/2016/02/26/creating-a-jekyll-image-gallery.html) explains different parts of the gallery and design choices. Use this guide and the files in this repo to make your own photo gallery.

## Add a New Image to the Messier Gallery

1. Identify the image you want to use. It should be in jpg or png format (don't use jpeg)
2. Rename the image m[whatever]-large.jpg
3. Create a thumbnail using imagemagick: convert m[whatever]-large.jpg -resize 300x -strip m[whatever]-thumb.jpg
4. Copy these files to assets/astrophotography/messier
5. cd to _data/galleries
6. run ../../scripts/messier-gallery.py from that location
  That script is also here: https://gist.github.com/dmoulton/0d9ce1da1a60a0e991e0a497a7ee5b5b
7. If you want to change the display title for an object, modify the messier.yaml file in _data/galleries after the images are imported

## Add a New Image to the Other Gallery

1. Identify the image you want to use. It should be in jpg or png format (don't use jpeg)
2. Rename the image [whatever]-large.jpg. Whatever you use for the filename, aside from -large, will be used as the display title for this object in the gallery.
3. Create a thumbnail using imagemagick: convert [whatever]-large.jpg -resize 300x -strip [whatever]-thumb.jpg
4. Copy these files to assets/astrophotography/other
5. cd to _data/galleries
6. Run ../../scripts/other-gallery.py from that location
7. New images will be added to the top of the gallery. If you would like to change the order, or modify the titles for anything, you will need to do that in the yaml file after the image or images are imported.

## License

The code is licensed under MIT license (see LICENSE-CODE.md). The images in the `assets/photography` folder are licensed under CC-BY-NC-SA license (see LICENSE-IMAGES.md).
