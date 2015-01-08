#!/usr/bin/perl -w
use strict;

BEGIN {
    unshift @INC, split( /:/, $ENV{FOSWIKI_LIBS} );
}

package TopicOrderPluginBuild;

use Foswiki::Contrib::Build;
our @ISA = qw( Foswiki::Contrib::Build );

use File::Copy;
use File::Find;
use File::Spec;

use JavaScript::Minifier;
use CSS::Minifier;

my $basedir = "";
my $plugin = "TopicOrderPlugin";

sub new {
  my $class = shift;
  return bless( $class->SUPER::new( $plugin ), $class );
}

sub target_build {
    my $this = shift;

    $this->SUPER::target_build();
    my $opts = { no_chdir => 1, wanted => \&_handleFile };
    $basedir = $this->{basedir};
    find( $opts, $basedir );
}

sub _handleFile {
  return if -d;

  my $file = $_;
  my $relpath = File::Spec->abs2rel( $file, $basedir );
  return if $relpath !~ m#/#;

  my $pub = "pub/System/$plugin";
  my $styles = "$pub/styles";
  my $scripts = "$pub/scripts";

  if ( $relpath =~ /^$styles/ || $relpath =~ /^$scripts/ ) {
    _minify($relpath) unless ( $relpath =~ /\.min\.(css|js)$/ );
  }
}

sub _readfile {
  my $name = shift;
  open(IN, "<", $name) or die "Can't open `$name' for reading: $!";
  my @data = grep { !/\@Packager\.RemoveLine/ } <IN>;
  close(IN);
  return join('', @data);
}

sub _writefile {
  my $path = shift;
  my $data = shift;

  unlink $path if ( -l $path );
  open(OUT, ">", $path) or die "Can't create file $path: $!";
  print OUT $data;
  close(OUT);
}

sub _minify {
  my $file = shift;

  my $target = $file;
  my $data = _readfile($file);

  if ( $file =~ /\.js$/ ) {
    $target =~ s/\.js$/\.min\.js/;
    _writefile($target, JavaScript::Minifier::minify(input => $data));
  } elsif ( $file =~ /\.css$/ ) {
    $target =~ s/\.css$/\.min\.css/;
    _writefile($target, CSS::Minifier::minify(input => $data));
  } else {
    return $file;
  }

  return $target;
}

package main;
my $build = new TopicOrderPluginBuild();
$build->build( $build->{target} );

