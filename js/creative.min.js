(function($) {
    "use strict";

    // Smooth page scrolling for anchor links
    $('a.page-scroll').bind('click', function(event) {
        var $anchor = $(this);
        var href = $anchor.attr('href');
        if (href && href.charAt(0) === '#') {
            $('html, body').stop().animate({
                scrollTop: ($(href).offset().top - 50)
            }, 1000, 'easeInOutExpo');
            event.preventDefault();
        }
    });

    // Scroll indicator click
    $('.scroll-indicator').on('click', function() {
        var target = $(this).data('href') || '#about';
        $('html, body').stop().animate({
            scrollTop: ($(target).offset().top - 50)
        }, 1000, 'easeInOutExpo');
    });

    // Highlight the top nav as scrolling occurs
    $('body').scrollspy({
        target: '.navbar-fixed-top',
        offset: 51
    });

    // Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function() {
        $('.navbar-toggle:visible').click();
    });

    // Offset for Main Navigation
    $('#mainNav').affix({
        offset: {
            top: 100
        }
    });

    // Initialize ScrollReveal
    window.sr = ScrollReveal();

    sr.reveal('.sr-icons', {
        duration: 600,
        scale: 0.9,
        distance: '20px',
        origin: 'bottom',
        easing: 'ease-out'
    }, 200);

    sr.reveal('.sr-project', {
        duration: 600,
        scale: 0.95,
        distance: '30px',
        origin: 'bottom',
        easing: 'ease-out',
        interval: 100
    });

    sr.reveal('.sr-contact', {
        duration: 600,
        scale: 0.95,
        distance: '20px',
        origin: 'bottom',
        easing: 'ease-out',
        interval: 100
    });

})(jQuery);
