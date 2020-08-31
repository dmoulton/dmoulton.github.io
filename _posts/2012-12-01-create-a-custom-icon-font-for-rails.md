---
title: Creating a Custom Icon Font For Rails
layout: post
categories: programming ruby
comments: true
archived: true
---
If you've used any @font-face icon fonts, whether with twitter-boostrap or Zurb, or elsewhere, you know they can be handy. Its nice from a rails perspective to have them bundled up in an engine, and its nice to have an easy-to-remember name to find them with.

Its relatively easy to find free or low-cost icon fonts that you can use with @font-face. The problem is that they might not be Rails ready, and there might be a few hundred in a font, when you only need 10. If you'd like to be picky about which icons you include in your app, or perhaps you want different icons from different font sets, follow along.

There are lots of ways to get a set of icon fonts. I'm choosing to use Fontello.

So, to start off, **go to [Fontello](http://fontello.com) and create the set of icons that you want to use. Download and unzip.**

We'll be modifying the instructions for gemifying assets that can be found in Derek Prior's blog at [prioritized.net](http://prioritized.net/blog/gemify-assets-for-rails).

<hr />

1. Use Bundler to create the gem
    {% highlight sh %}$ bundle gem myfonts{% endhighlight %}
2. Edit lib/myfonts.rb and add:
    {% highlight ruby %}class Engine < ::Rails::Engine
   end{% endhighlight %}
3. We're going to add everything we need to the vendor directory.
    {% highlight sh %}$ mkdir -p vendor/assets/fonts
  $ mkdir vendor/assets/stylesheets{% endhighlight %}
4. The fontello download contains a font directory with several fonts in it. Copy the contents of that directory to the fonts directory you just created.

5. Edit the .gemspec file and change gem.files to:
    {% highlight ruby %}gem.files = Dir["{lib,vendor}/**/*"] + ["LICENSE.txt", "README.md"]{% endhighlight %}
6. Then add:
    {% highlight ruby %}gem.add_dependency "railties", "~> 3.1"{% endhighlight %}
6. You should also edit the gem description and summary to their proper values. Here is my gemspec as a sample result:
    {% highlight ruby %} lib = File.expand_path('../lib', __FILE__)
    $LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
    require 'myfonts/version'
    Gem::Specification.new do |gem|
      gem.name          = "myfonts"
      gem.version       = Myfonts::VERSION
      gem.authors       = ["David Moulton"]
      gem.email         = ["dave@themoultons.net"]
      gem.description   = %q{Demo gem for icon fonts}
      gem.summary       = %q{Demo of how to create icon fonts for rails}
      gem.homepage      = "https://github.com/dmoulton/myfonts-demo"
      gem.files = Dir["{lib,vendor}/**/*"] + ["LICENSE.txt", "README.md"]
      gem.executables   = gem.files.grep(%r{^bin/}).map{ |f| File.basename(f) }
      gem.test_files    = gem.files.grep(%r{^(test|spec|features)/})
      gem.require_paths = ["lib"]
      gem.add_dependency "railties", "~> 3.1"
    end{% endhighlight %}
7. Copy the fontello.css file from the fontello download to vendor/assets/stylesheets. I haven't needed the other css files.

8. Rename the fontello.css file
    {% highlight sh %}$ mv vendor/assets/stylesheets/fontello.css vendor/assets/stylesheets/myfonts.css{% endhighlight %}
8. You will need to edit the src: lines in the css file to look for the fonts in assets. I count 5 places to edit in my demo.
    {% highlight css %}src: url("/assets/fontello.eot");
  src: url("/assets/fontello.eot?#iefix") format('embedded-opentype'), url("/assets/fontello.woff") format('woff'), url("/assets/fontello.ttf") format('truetype'), url("/assets/fontello.svg#fontello") format('svg');{% endhighlight %}
9. If you would like a convenient way to change the colors of the icons, add something like this at the end of the css file:
    {% highlight css %} .icon-red {
      color: red;
    }
    .icon-green {
      color: green;
    }
    .icon-white {
      color: white;
      background-color: black;
    }{% endhighlight %}
10. The above will allow you to use html such as:
    {% highlight css %}<i class='icon-emo-happy icon-green'></i>{% endhighlight %}
11. You'll add this to your rails app as you normally would any other gem. I would recommend not pushing to rubygems.org, and just serving the gem from github or bitbucket or your own gem server. Use this example, changing the url to your own, unless you want to use my 4 emoticons:
    {% highlight ruby %}gem 'myfonts', :git=>'git://github.com/dmoulton/myfonts-demo.git'{% endhighlight %}
12. You should then edit your app/assets/stylesheets/application.css file using this example, remembering that its the name of the css file, sans extension, that you should use.
    {% highlight css %}/*
 * ...
 *
 *= require myfonts
 *= require_self
 *= require_tree .
 */{% endhighlight %}
13. You can then use html like this:
    {% highlight html %}<i class="icon-emo-happy"></i>{% endhighlight %}

That's about it. If you would like to see my demos, they can be found here:

Gem: [https://github.com/dmoulton/myfonts-demo](https://github.com/dmoulton/myfonts-demo)

Rails App: [https://github.com/dmoulton/myfonts-demo-app](https://github.com/dmoulton/myfonts-demo-app)

----

###Resources

[Derek Prior's blog entry on gemifying assets](http://prioritized.net/blog/gemify-assets-for-rails)

[Fontello](http://fontello.com)
