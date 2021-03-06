(function($) {
    var cnt = 0;
    var step = 1;
    var order, opts, confirmText, tooltip;

    $(document).ready(function() {
        var $opts = $('.topicorder .opts');
        if ( $opts.length === 0 ) return;

        var $order = $('.topicorder .order');
        if ( $order.length === 0 ) return;

        try {
            opts = $.parseJSON($opts.text());
            var json = $.parseJSON($order.text());
            order= json.order;
            confirmText = json.confirm;
            tooltip = json.tooltip;
        } catch ( e ) {
            if ( window.console && console.error ) {
                console.error( e );
            }

            return;
        }

        var $table = $('.topicorder .table table');
        if ( $('.modacEditPage').length > 0 ) {
            var $thead = $table.find('thead');
            if ( $thead.length > 0 ) {
                $('<th></th>').appendTo( $thead.find('tr') );
            }
        }

        var $tbody = $table.find('tbody');

        // "fix" styling
        $table.removeClass('foswikiTable');
        $tbody.find('tr, th, td').each( function() {
            $(this).removeClass();
        });

        // sort rows
        var start, end;
        var sorted = _.sortBy($tbody.find('tr'), function(row) {
            var $tr = $(row);
            var tds = $tr.find('td');

            var linkCol = tds[opts.linkCol];
            var $a = $(linkCol).find('a');
            var link = $a.attr('href');
            if ( link && link.length > 0 ) {
				link = link.substr(1).replace(/\//g, '.');
            }

            var filter = {name: link};
            var entry = _.findWhere( order, filter );
            var pos = 0;

            if ( entry.detached ) {
                $tr.attr('data-detached', 1);
                $tr.css('display', 'none');
            }

            if ( entry ) {
                pos = entry.value || 0;
            }

            if ( $('.modacEditPage').length > 0 ) {
                var $trash = $('<td class="trash" title="' + tooltip + '">&nbsp;</td>');
                $trash.appendTo( $tr );
            }

            $tr.attr('data-order', pos );
            return parseInt( pos );
        });

        // attach click handler to the table itself (jqui sortable swallows child clicks)
        $table.on('click', function( evt ) {
            if ( $(evt.target).hasClass('trash') ) {
                removeStep( evt.target );
            }
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

    var removeStep = function( td ) {
        if ( !confirm(confirmText) ) {
            return;
        }

        var $td = $(td);
        var $tr = $td.parent();
        var link = $tr.data('link');
        if ( /^\s*$/i.test( name ) ) {
            return;
        }

        var p = foswiki.preferences;
        var url = [p.SCRIPTURL, '/rest', p.SCRIPTSUFFIX, '/TopicOrderPlugin/detach'];
        var payload = {
            web: p.WEB,
            topic: p.TOPIC,
            id: link
        };

        $.blockUI();
        $.ajax({
            url: url.join(''),
            type: 'POST',
            data: {
                payload: JSON.stringify(payload)
            },
            success: function() {
                $tr.remove();
                updateSteps(opts.stepCol);
                $.unblockUI();
            },
            error: function(xhr, status, err) {
                $.unblockUI();
                if ( window.console && console.error ) {
                    console.error( xhr );
                    console.error( err );
                }
            }
        });
    };

    var updateSteps = function(colIndex) {
        var step = 1;
        var $tbody = $('.topicorder .table table tbody');
        $tbody.find('tr').each(function() {
            var $this = $(this);
            if ( !$this.data('detached') ) {
                var tds = $this.find('td');
                $(tds[colIndex]).text(step++);
            } else {
                $this.remove();
            }
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
