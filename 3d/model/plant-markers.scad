// Herba et Fructus – parametrické záhradné zápichovače.
// Adaptované podľa používateľského modelu "Parametric Plant Markers 5mm.scad".
// Rozmery sú v mm. Pri generovaní z webu sa hodnoty nastavujú parametrami -D.
/* [Názvy štítkov] */
Name_1 = "Ildi";
Name_2 = "Golden Canary";
Name_3 = "";
Name_4 = "";
Name_5 = "";
Name_6 = "";
Name_7 = "";
Name_8 = "";
Name_9 = "";
Name_10 = "";
Name_11 = "";
Name_12 = "";

/* [Text a písmo] */
font_choice = "Liberation Sans"; // [Liberation Sans, Liberation Serif]
text_size = 10; // [6:0.5:20]
text_height = 1.4; // [1:0.1:6]
max_text_length = 80; // [30:1:150]

/* [Lem a základňa] */
border_radius = 1.5; // [0.5:0.1:5]
base_height = 2.5; // [1:0.1:10]

/* [Farby náhľadu – nie sú v STL] */
base_color = "Black";
top_color = "Lime";

/* [Rozmery zápichu] */
stick_length = 160; // [50:1:300]
stick_width = 5; // [3:0.5:20]
tip_length = 25; // [10:1:100]
stick_roundness = 1.0; // [0:0.1:5]

/* [Bočné výrezy, iba paličky aspoň 10 mm] */
enable_cutouts = true;
cutout_length = 20; // [5:1:50]
cutout_depth = 3; // [1:0.5:10]
cutout_offset = 0; // [-50:0.5:50]

/* [Stredová dierka, iba paličky aspoň 10 mm] */
enable_center_hole = true;
hole_length = 20; // [5:1:50]
hole_width = 3; // [1:0.5:10]
hole_offset = 0; // [-50:0.5:50]

/* [Pozícia textu a rozloženie] */
text_right_margin = 3; // [0:0.5:20]
text_y_factor = 0.5; // [0:0.01:1]
y_spacing = 18; // [10:1:50]
$fn = 40;

raw_list = [Name_1, Name_2, Name_3, Name_4, Name_5, Name_6, Name_7, Name_8, Name_9, Name_10, Name_11, Name_12];
labels = [for (l = raw_list) if (len(l) > 0) l];
total_count = len(labels);
text_y = text_y_factor * stick_width;
font_name = font_choice == "Liberation Serif" ? "Liberation Serif:style=Bold" : "Liberation Sans:style=Bold";

// Pôvodný päťmilimetrový profil s klinovým hrotom a voliteľnými výrezmi.
module stick_profile() {
    module base_stick() {
        if (stick_roundness > 0) {
            hull() {
                polygon(points=[[0,stick_width/2],[tip_length,0],[tip_length,stick_width]]);
                translate([tip_length,0])
                    offset(r=stick_roundness) offset(delta=-stick_roundness)
                        polygon(points=[[0,0],[stick_length-tip_length,0],[stick_length-tip_length,stick_width],[0,stick_width]]);
            }
        } else {
            polygon(points=[[0,stick_width/2],[tip_length,0],[stick_length,0],[stick_length,stick_width],[tip_length,stick_width]]);
        }
    }
    difference() {
        base_stick();
        if (enable_cutouts && stick_width >= 10) {
            translate([stick_length/3+cutout_offset,0])
                scale([cutout_length/2,cutout_depth]) circle(r=1);
            translate([stick_length/3+cutout_offset,stick_width])
                scale([cutout_length/2,cutout_depth]) circle(r=1);
        }
        if (enable_center_hole && stick_width >= 10) {
            translate([(tip_length+stick_length/3)/2+hole_offset,stick_width/2])
                hull() {
                    translate([-(hole_length-hole_width)/2,0]) circle(d=hole_width);
                    translate([(hole_length-hole_width)/2,0]) circle(d=hole_width);
                }
        }
    }
}

module marker_text(txt) {
    let(
        approx_width=len(txt)*text_size*0.6,
        calculated_size=approx_width>max_text_length ? text_size*(max_text_length/approx_width) : text_size
    )
    translate([stick_length-text_right_margin,text_y])
        text(txt,size=calculated_size,halign="right",valign="center",font=font_name);
}

module plant_marker(txt) {
    color(base_color)
        linear_extrude(height=base_height) {
            union() {
                stick_profile();
                offset(r=border_radius) marker_text(txt);
            }
        }
    color(top_color)
        translate([0,0,base_height])
            linear_extrude(height=text_height) marker_text(txt);
}

grid_width_y=(total_count-1)*y_spacing+stick_width;
if (total_count>0)
    translate([-stick_length/2,grid_width_y/2-stick_width,0])
        for (i=[0:total_count-1])
            translate([0,-i*y_spacing,0]) plant_marker(labels[i]);
