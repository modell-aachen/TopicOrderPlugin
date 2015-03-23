(function($) {
    var cnt = 0;
    var step = 1;
    var order, opts;

    $(document).ready(function() {
        var $opts = $('.topicorder .opts');
        if ( $opts.length === 0 ) return;

        var $order = $('.topicorder .order');
        if ( $order.length === 0 ) return;

        try {
            opts = $.parseJSON($opts.text());
            order = $.parseJSON($order.text());
        } catch ( e ) {
            if ( window.console && console.error ) {
                console.error( e );
            }

            return;
        }

        var $table = $('.topicorder .table table');
        var $tbody = $table.find('tbody');

        // "fix" styling
        $table.removeClass('foswikiTable');
        $tbody.find('tr, th, td').each( function() {
            $(this).removeClass();
        });

        // sort rows and apply styling according to their maturity value
        var start, end;
        var sorted = _.sortBy($tbody.find('tr'), function(row) {
            var $tr = $(row);
            var tds = $tr.find('td');

            if ( opts.maturityCol >= 0 && typeof opts.maturity === "object" ) {
                var maturity = parseInt( $(tds[opts.maturityCol]).text() );
                for( var color in opts.maturity ) {
                    var c = opts.maturity[color];
                    if ( maturity >= c.from && maturity <= c.to ) {
                        $tr.css('background-color', c.color);
                        break;
                    }
                }
            }

            var linkCol = tds[opts.linkCol];
            var $a = $(linkCol).find('a');
            var link = $a.attr('href');
            if ( link && link.length > 0 ) {
                link = link.substr(1).replace('/', '.');
            }

            var filter = {name: link};
            var entry = _.findWhere( order, filter );
            var pos = 0;

            if ( entry ) {
                pos = entry.value || 0;
            }

            $tr.attr('data-order', pos );
            return parseInt( pos );
        });

        // apply sorted rows to the actual table
        $tbody.empty();
        _.each(sorted, function(row) {
            updateDataAttrs(row);
            $tbody.append(row);
        });

        // update steps counter
        updateSteps(opts.stepCol);

        // disable drag'n drop while not editing
        var prefs = foswiki.preferences;
        var pattern = new RegExp( '^' + prefs.SCRIPTURL + '/edit' );
        if ( !pattern.test( window.location.href ) )
            return;

        // Drag'n Drop brought to you by jqUI
        $tbody.sortable({
            cursor: "move",
            start: function(event, ui) {
                start = ui.item.prevAll().length + 1;
            },
            update: function(event, ui) {
                end = ui.item.prevAll().length + 1;
                $.blockUI();
                updateOrder().done(function() {
                    updateSteps(opts.stepCol);
                }).fail(function(e) {
                    if (window.console && console.error) {
                        console.error(e);
                    }
                }).always($.unblockUI);
            }
        });
    });

    var updateOrder = function() {
        var deferred = $.Deferred();
        var arr = [];
        try {
            var $tbody = $('.topicorder .table table tbody');
            var rows = $tbody.find('tr');
            for (var i = 0; i < rows.length; ++i) {
                var $row = $(rows[i]);
                $row.data('order', i + 1);
                arr.push({
                    link: $row.data('link'),
                    order: $row.data('order')
                });
            }
        } catch (e) {
            deferred.reject(e);
            return deferred.promise();
        }
        var prefs = foswiki.preferences;
        var url = [prefs.SCRIPTURL, '/rest', prefs.SCRIPTSUFFIX, '/TopicOrderPlugin/reorder'];
        var payload = {
            payload: arr,
            web: prefs.WEB,
            topic: prefs.TOPIC
        };
        $.ajax({
            url: url.join(''),
            type: 'POST',
            data: {
                payload: JSON.stringify(payload)
            },
            success: function() {
                deferred.resolve();
            },
            error: function(xhr, status, err) {
                deferred.reject(err);
            }
        });
        return deferred.promise();
    };

    var updateSteps = function(colIndex) {
        var step = 1;
        var $tbody = $('.topicorder .table table tbody');
        $tbody.find('tr').each(function() {
            var tds = $(this).find('td');
            $(tds[colIndex]).text(step++);
        });
    };

    var updateDataAttrs = function(row) {
        var $row = $(row);
        var tds = $row.find('td');
        var col = tds[opts.linkCol];
        var a = $(col).find('a');
        if (a.length > 0) {
            var link = a[0];
            for (var i in order) {
                var o = order[i];
                var pattern = new RegExp(o.name);
                if (pattern.test(link.pathname)) {
                    $row.data('order', o.value);
                    $row.data('link', o.name);
                    break;
                }
            }

            var path = link.pathname;
            var split = path.split('/');
            var len = split.length;
            if ( len >= 2 ) {
                var topic = split[len - 1];
                var web = split[len - 2];
                $row.data('link', web + '.' + topic);
            }
        }
    };
})(jQuery);
