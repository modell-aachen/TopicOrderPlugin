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
            console.log($opts.text());
            opts = $.parseJSON($opts.text());
            order = $.parseJSON($order.text());
        } catch ( e ) {
            if ( window.console && console.error ) {
                console.error( e );
            }

            return;
        }

        var $table = $('.topicorder .table table');

        // "fix" styling
        $table.removeClass('foswikiTable');
        $table.find('tr, th, td').each( function() {
            $(this).removeClass();
        });


        var $body = $table.find('tbody');
        var start, end;

        // initialize DataTable
        var $dt = $table.dataTable({
            autoWidth: true,
            info: false,
            jQueryUI: false,
            lengthChange: false,
            ordering: false,
            paging: false,
            searching: false,
            stateSave: true,
            rowCallback: function(row, data, index) {
                updateDataAttrs(row);
            }
        });

        // sort rows and apply styling according to their maturity value
        var sorted = _.sortBy($body.find('tr'), function(row) {
            var $tr = $(row);

            if ( opts.maturityCol >= 0 && typeof opts.maturity === "object" ) {
                var tds = $tr.find('td');
                var maturity = parseInt( $(tds[opts.maturityCol]).text() );
                for( var color in opts.maturity ) {
                    var c = opts.maturity[color];
                    if ( maturity >= c.from && maturity <= c.to ) {
                        $tr.css('background-color', c.color);
                        break;
                    }
                }
            }

            return $tr.data('order');
        });

        // apply sorted rows to the actual DataTable
        $body.empty();
        _.each(sorted, function(row) {
            updateDataAttrs(row);
            $body.append(row);
        });

        // update steps counter
        updateSteps(opts.stepCol);

        // disable drag'n drop while not editing
        var prefs = foswiki.preferences;
        var pattern = new RegExp( '^' + prefs.SCRIPTURL + '/edit' );
        if ( !pattern.test( window.location.href ) )
            return;


        // Drag'n Drop brought to you by jqUI
        $body.sortable({
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
            var $body = $('.topicorder .table table tbody');
            var rows = $body.find('tr');
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
        var $body = $('.topicorder .table table tbody');
        $body.find('tr').each(function() {
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
