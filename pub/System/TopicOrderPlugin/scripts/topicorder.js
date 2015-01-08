(function($) {
    var cnt = 0;
    var step = 1;
    var order, opts;

    $(document).ready(function() {
        opts = JSON.parse($('.topicorder .opts').text());
        order = JSON.parse($('.topicorder .order').text());
        var $table = $('.topicorder .table table');
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

        // sort rows
        var sorted = _.sortBy($body.find('tr'), function(row) {
            return $(row).data('order');
        });

        // apply sorted rows to the actual DataTable
        $body.empty();
        _.each(sorted, function(row) {
            updateDataAttrs(row);
            $body.append(row);
        });

        // update steps counter
        updateSteps(opts.stepCol);

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
                    $(row).data('order', o.value);
                    $(row).data('link', o.name);
                    break;
                }
            }
        }
    };
})(jQuery);
