---
---
(function () {
    var url =
        "https://www.astrobin.com/api/v1/image/?user=dmoulton" +
        "&api_key={{ site.astrobin_key }}" +
        "&api_secret={{ site.astrobin_secret }}" +
        "&format=json&limit=10&offset=0";

    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    function formatDate(uploaded) {
        var s = (uploaded || "").split("T")[0];
        if (!s) return "";
        var parts = s.split("-");
        return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
    }

    function renderImage(objects, index, wrap, info, dots) {
        var img = objects[index];
        var ident = img.hash || img.id;
        var href = "https://www.astrobin.com/" + ident;
        var dateStr = formatDate(img.uploaded);

        var tmp = document.createElement("div");
        tmp.innerHTML = img.description || "";
        var desc = (tmp.textContent || tmp.innerText || "").trim();
        if (desc.length > 300) desc = desc.substring(0, 300) + "…";

        wrap.style.opacity = "0";
        info.style.opacity = "0";

        setTimeout(function () {
            wrap.innerHTML =
                '<a href="' + href + '" target="_blank" rel="noopener">' +
                '<img src="' + img.url_regular + '" alt="' + (img.title || "Astrophoto").replace(/"/g, "&quot;") + '" loading="lazy">' +
                '</a>';
            var heroImg = wrap.querySelector("img");
            heroImg.addEventListener("load", function () {
                if (this.naturalHeight > this.naturalWidth) {
                    this.style.objectFit = "contain";
                }
            });

            info.innerHTML =
                '<h2 class="hero-title">' + (img.title || "Untitled").replace(/</g, "&lt;") + "</h2>" +
                (dateStr ? '<p class="hero-date">Uploaded ' + dateStr + "</p>" : "") +
                (desc ? '<p class="hero-description">' + desc + "</p>" : "") +
                '<a class="hero-link" href="' + href + '" target="_blank" rel="noopener">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
                "View on Astrobin</a>";

            dots.querySelectorAll(".hero-dot").forEach(function (d, i) {
                d.classList.toggle("hero-dot-active", i === index);
            });

            wrap.style.opacity = "1";
            info.style.opacity = "1";
        }, 400);
    }

    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onload = function () {
        if (req.status < 200 || req.status >= 400) return;
        var data;
        try { data = JSON.parse(req.response); } catch (e) { return; }
        var objects = data["objects"];
        if (!objects || objects.length === 0) return;

        var wrap = document.getElementById("hero-image-wrap");
        var info = document.getElementById("hero-info");
        var dots = document.getElementById("hero-dots");
        var current = 0;
        var timer;

        dots.innerHTML = objects.map(function (_, i) {
            return '<span class="hero-dot' + (i === 0 ? " hero-dot-active" : "") + '" data-i="' + i + '"></span>';
        }).join("");

        dots.querySelectorAll(".hero-dot").forEach(function (d) {
            d.addEventListener("click", function () {
                current = parseInt(this.getAttribute("data-i"), 10);
                clearInterval(timer);
                renderImage(objects, current, wrap, info, dots);
                timer = setInterval(advance, 10000);
            });
        });

        function advance() {
            current = (current + 1) % objects.length;
            renderImage(objects, current, wrap, info, dots);
        }

        renderImage(objects, 0, wrap, info, dots);
        timer = setInterval(advance, 10000);
    };
    req.send();
})();
