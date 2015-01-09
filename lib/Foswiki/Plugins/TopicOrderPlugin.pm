package Foswiki::Plugins::TopicOrderPlugin;

use strict;
use warnings;

use Foswiki::Func;
use Foswiki::Meta;
use Foswiki::Plugins;

use version;
use JSON;

our $VERSION = version->declare( '1.0.0' );
our $RELEASE = '1.0.0';
our $NO_PREFS_IN_TOPIC = 1;
our $SHORTDESCRIPTION = 'TBD.';

sub initPlugin {
  my ( $topic, $web, $user, $installWeb ) = @_;

  if ( $Foswiki::Plugins::VERSION < 2.0 ) {
      Foswiki::Func::writeWarning( 'Version mismatch between ',
          __PACKAGE__, ' and Plugins.pm' );
      return 0;
  }

  Foswiki::Meta::registerMETA('TOPICORDER', many => 1);
  Foswiki::Meta::registerMETA('TOPICPOSITION', many => 0);

  Foswiki::Func::registerTagHandler( 'TOPICORDER', \&_tagTOPICORDER );
  Foswiki::Func::registerRESTHandler( 'reorder', \&_restREORDER );

  my $debug = $Foswiki::cfg{Plugins}{TopicOrderPlugin}{Debug} || 0;
  my $suffix = $debug ? '' : '.min';
  my $usuffix = $debug ? '' : '-min';
  my $base = '%PUBURLPATH%/%SYSTEMWEB%/TopicOrderPlugin';
  my $scripts = "$base/scripts";
  my $styles = "$base/styles";
  my $bower = "$base/bower_components";
  my $dt = "$bower/datatables/media";
  my $u = "$bower/underscore";

  my $mappings = $Foswiki::cfg{Plugins}{TopicOrderPlugin}{Mappings} || {};
  return 1 unless $mappings->{$web};

  Foswiki::Func::addToZone( 'script', 'TOPICORDERPLUGIN::SCRIPTS', <<SCRIPT, 'JQUERYPLUGIN::FOSWIKI' );
<script type="text/javascript" src="$dt/js/jquery.dataTables$suffix.js?version=$RELEASE"></script>
<script type="text/javascript" src="$u/underscore$usuffix.js?version=$RELEASE"></script>
<script type="text/javascript" src="$scripts/topicorder$suffix.js?version=$RELEASE"></script>
SCRIPT

  Foswiki::Func::addToZone( 'head', 'TOPICORDERPLUGIN::STYLES', <<STYLE );
<link rel='stylesheet' type='text/css' media='all' href='$dt/css/jquery.dataTables$suffix.css?version=$RELEASE' />
<link rel='stylesheet' type='text/css' media='all' href='$styles/topicorder$suffix.css?version=$RELEASE' />
STYLE

  return 1;
}

sub afterSaveHandler {
  my ( $text, $topic, $web, $error, $meta ) = @_;

  my ($w, $t) = _getParent( $web, $topic, $meta );
  return if ($w eq 0 || $t eq 0);

  my $name = 'TOPICORDER';
  my ($parentMeta, $txt) = Foswiki::Func::readTopic( $w, $t );
  my $existing = $parentMeta->get( $name, "$web.$topic");
  return if defined $existing;

  my $count = $parentMeta->count( $name );
  my $new = {name => "$web.$topic", value => $count + 1};

  $parentMeta->putKeyed( $name, $new );
  $parentMeta->saveAs( $w, $t, minor => 1 );
  $parentMeta->finish();
}

sub afterRenameHandler {
   my ( $oldWeb, $oldTopic, $oldAttachment,
        $newWeb, $newTopic, $newAttachment ) = @_;

   my ($w, $t) = _getParent( $oldWeb, $oldTopic );
   return if ($w eq 0 || $t eq 0);

   my ($meta, $text) = Foswiki::Func::readTopic( $w, $t );
   my $old = $meta->get( 'TOPICORDER', "$oldWeb.$oldTopic" );
   my $value = $old->{value};
   return unless $value;

   my $trash = $Foswiki::cfg{TrashWebName} || 'Trash';
   if ( $newWeb != $trash ) {
    my $new = {name => "$newWeb.$newTopic", value => $value};
    $meta->putKeyed( 'TOPICORDER', $new );
   }

   $meta->remove( 'TOPICORDER', "$oldWeb.$oldTopic" );
   $meta->saveAs( $w, $t, minor => 1 );
   $meta->finish();
}

sub _getParent {
  my ( $web, $topic, $meta ) = @_;
  
  my $mappings = $Foswiki::cfg{Plugins}{TopicOrderPlugin}{Mappings} || {};
  my $key = $mappings->{$web};
  return (0, 0) unless $key;

  unless ($meta) {
    my ($m, $txt) = Foswiki::Func::readTopic( $web, $topic );
    $meta = $m;
  }

  my $field = $meta->get( 'FIELD', $key );
  return (0, 0) unless $field;

  my $parent = $field->{value};
  return (0, 0) unless $parent;

  my ($w, $t) = (undef, undef);
  if ( $parent =~ m/\.|\// ) {
    ($w, $t) = Foswiki::Func::normalizeWebTopicName( '', $parent );
  } else {
    ($w, $t) = Foswiki::Func::normalizeWebTopicName( $web, $parent );
  }

  return ($w, $t);
}

sub _restREORDER {
  my ( $session, $subject, $verb, $response ) = @_;
  my $query = $session->{request};

  my $param = $query->{param}->{payload}[0];
  my $payload = decode_json( $param );
  
  my ($web, $topic) = Foswiki::Func::normalizeWebTopicName( $payload->{web}, $payload->{topic} );
  my ($meta, $text) = Foswiki::Func::readTopic( $web, $topic );

  my $arr = $payload->{payload};
  foreach (@$arr) {
    my $entry = $_;
    my $new = {
      name => $entry->{link},
      value => $entry->{order}
    };

    $meta->putKeyed( 'TOPICORDER', $new );
  }

  $meta->saveAs( $web, $topic, minor => 1 );
  $meta->finish();
  

  return "";
}

sub _tagTOPICORDER {
  my( $session, $params, $topic, $web, $topicObject ) = @_;

  ($web, $topic) = Foswiki::Func::normalizeWebTopicName( $web, $topic );
  my ($meta, $text) = Foswiki::Func::readTopic( $web, $topic );
  my @order = $meta->find('TOPICORDER');
  return encode_json( \@order );
}

1;

__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Author: Sven Meyer <meyer@modell-aachen.de>

Copyright (C) 2008-2015 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
