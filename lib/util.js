"use strict";

var Entities = require('html-entities').AllHtmlEntities;
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');
var base_url = 'https://www.youtube.com/results?';

// builds the search query url
exports.build_link = function(query) {
	return base_url + querystring.encode({
		search_query: query,
		spf: 'navigate',
		gl: 'US',
		hl: 'en'
	});
}

// start of parsing an item
exports.parse_item = function(string) {
	var titles = exports.between(string, '<div class="', '"');
	var type = exports.between(titles, 'yt-lockup yt-lockup-tile yt-lockup-', ' ');
	if(type === 'playlist') {
		return exports.parse_playlist(string);
	} else if(type === 'channel') {
		return exports.parse_channel(string);
	} else if(type === 'video') {
		return exports.parse_video(string);
	} else if(type === 'movie-vertical-poster') {
		return exports.parse_movie(string);
	} else if(titles === 'search-refinements') {
			return exports.parse_related_searches(string);
	} else if(titles.includes('shelf') && string.includes('<div class="compact-shelf')) {
			return exports.parse_shelf_compact(string);
	} else if(titles.includes('shelf') && string.includes('<div class="vertical-shelf">')) {
			return exports.parse_shelf_vertical(string);
	} else {
		console.error('\n/*****************************************************************************************************************************************************************************');
		console.error('found an unknwon type |'+type+'|'+titles+'|');
		console.error('pls post the content of to the files in ' + __dirname + require('path').sep + 'dumbs to https://github.com/TimeForANinja/node-ytsr/issues');
		console.error('*****************************************************************************************************************************************************************************/\n');
		fs.exists(__dirname + '/dumbs', function(exists) {
			if(!exists) {
				fs.mkdir(__dirname + '/dumbs/', function(err) {
					fs.writeFile(__dirname + '/dumbs/' + Math.random().toString(36).substr(3) + '-' + Date.now() + '.dumb', type + '\n\n\n' + string, function(err) {});
				});
			}
			else fs.writeFile(__dirname + '/dumbs/' + Math.random().toString(36).substr(3) + '-' +  Date.now() + '.dumb', type + '\n\n\n' + string, function(err) {});
		});
		return null;
	}
}

// parse an item of type playlist
exports.parse_playlist = function(string) {
	var owner_box = exports.between(string, '<div class="yt-lockup-byline ">', '</div>');
	var thumbnail = exports.between(string, 'data-thumb="', '"');
	thumbnail = thumbnail ? thumbnail : exports.between(string, 'src="', '"');
	return {
		type: 'playlist',
		title: exports.remove_html(exports.between(exports.between(string, '<h3 class="yt-lockup-title ">', '</a>'), '>')),
		link: 'https://www.youtube.com/playlist?list=' + exports.remove_html(exports.between(string, 'data-list-id="', '"')),
		thumbnail: url.resolve(base_url, exports.remove_html(thumbnail)),

		author: {
			name: exports.remove_html(exports.between(owner_box, '>', '</a>')),
			id: exports.between(owner_box, 'data-ytid="', '"'),
			ref: url.resolve(base_url, exports.remove_html(exports.between(owner_box, '<a href="', '"'))),
			verified: string.includes('title="Verified"')
		},

		length: exports.remove_html(exports.between(string, '<span class="formatted-video-count-label">', '</span>'))
	}
}

// parse an item of type channel
exports.parse_channel = function(string) {
	var avatar = exports.between(string, 'data-thumb="', '"');
	avatar = avatar ? avatar : exports.between(string, 'src="', '"');
	return {
		type: 'channel',
		name: exports.remove_html(exports.between(exports.between(string, '<a href="', '</a>'), '>')),
		channel_id: exports.between(string, 'data-ytid="', '"'),
		link: url.resolve(base_url, exports.remove_html(exports.between(string, 'href="', '"'))),
		avatar: url.resolve(base_url, exports.remove_html(avatar)),
		verified: string.includes('title="Verified"') || string.includes('yt-channel-title-autogenerated'),

		followers: Number(exports.between(exports.between(string, 'yt-subscriber-count"', '</span>'), '>').replace(/\.|,/g, '')),
		description_short: exports.remove_html(exports.between(exports.between(string, '<div class="yt-lockup-description', '</div>'), '>')),
		videos: Number(exports.between(string, '<ul class="yt-lockup-meta-info"><li>', '</li>').split(' ').splice(0,1)[0].replace(/\.|,/g, ''))
	}
}

// parse an item of type video
exports.parse_video = function(string) {
	var owner_box = exports.between(string, '<div class="yt-lockup-byline ">', '</div>');
	var meta_info = exports.between(string, '<div class="yt-lockup-meta ">', '</ul>').replace(/<\/li>/g, '').split('<li>').splice(1);
	var thumbnail = exports.between(string, 'data-thumb="', '"');
	thumbnail = thumbnail ? thumbnail : exports.between(string, 'src="', '"');
	return {
		type: 'video',
		title: exports.remove_html(exports.between(exports.between(string, '<a href="', '</a>'), '>')),
		link: url.resolve(base_url, exports.remove_html(exports.between(string, 'href="', '"'))),
		thumbnail: url.resolve(base_url, exports.remove_html(thumbnail)),

		author: {
			name: exports.remove_html(exports.between(owner_box, '>', '</a>')),
			id: exports.between(owner_box, 'data-ytid="', '"'),
			ref: url.resolve(base_url, exports.remove_html(exports.between(owner_box, '<a href="', '"'))),
			verified: owner_box.includes('title="Verified"')
		},

		description: exports.remove_html(exports.between(exports.between(string, '<div class="yt-lockup-description', '</div>'), '>')) || null,
		views: meta_info[1] ? Number(meta_info[1].split(' ')[0].replace(/\.|,/g, '')) : null,
		duration: exports.between(string, '<span class="video-time" aria-hidden="true">', '</span>'),
		uploaded_at: meta_info[0] || null
	}
}

// parse am item of type movie
exports.parse_movie = function(string) {
	var haystack = string.substr(string.lastIndexOf('<div class="yt-lockup-meta"><ul>') + 32);
	var film_meta = haystack.substr(0, haystack.indexOf('</ul></div>'));
	var author_info = string.substr(string.lastIndexOf('<a'), string.lastIndexOf('</a>')) + '</a>';
	return {
		type: 'movie',
		title: exports.remove_html(exports.between(string, 'dir="ltr">', '</a>')),
		link: url.resolve(base_url, exports.remove_html(exports.between(string, 'href="', '"'))),
		thumbnail: url.resolve(base_url, exports.remove_html(exports.between(string, 'src="', '"'))),

		author: {
			name: exports.remove_html(exports.between(author_info, '>', '<')),
			id: exports.between(author_info, 'data-ytid="', '"'),
			ref: url.resolve(base_url, exports.remove_html(exports.between(author_info, '<a href="', '"'))),
			verified: string.includes('title="Verified"')
		},

		description: exports.remove_html(exports.between(string, 'yt-lockup-description', '</div>').replace(/[^>]+>/, '')) || null,
		meta: exports.remove_html(exports.between(string, '<div class="yt-lockup-meta"><ul><li>', '</li></ul>')).split(' · '),
		actors: film_meta.split('<li>')[1].replace(/<[^>]+>|^[^:]+: /g, '').split(', ').map(function(a) { return exports.remove_html(a) }),
		director: exports.remove_html(film_meta.split('<li>')[2].replace(/<[^>]+>|^[^:]+: /g, '')),
		duration: exports.between(string, '<span class="video-time" aria-hidden="true">', '</span>')
	}
}


// parse an item of type related searches
exports.parse_related_searches = function(string) {
	let related = string.split('search-refinement').splice(1);
	return related.map(function(item) {
		return {
			link: url.resolve(base_url, exports.remove_html(exports.between(item, 'href="', '"'))),
			q: querystring.parse(exports.remove_html(exports.between(item, '/results?', '"')))['q']
		}
	});
}

// horizontal shelf of youtube movie proposals
exports.parse_shelf_compact = function(string) {
	const items_raw = string.split('<li class="yt-uix-shelfslider-item').splice(1);
	let items =  items_raw.map(function(item) {
		const item_meta = exports.between(item, 'grid-movie-renderer-metadata"><li>', '</li>').split('·');
		const views = exports.between(item, '<ul class="yt-lockup-meta-info">', '</li>').replace(/<[^>]+>| .*/g, '');
		return {
			type: exports.between(item, ' ', '-')+'-short',
			ref: url.resolve(base_url, exports.remove_html(exports.between(item, 'href="', '"'))),
			thumbnail: url.resolve(base_url, exports.remove_html(exports.between(item, 'src="', '"'))),
			duration: exports.between(item, '"video-time"', '<').replace(/^[^>]+>/, ''),
			published: item_meta[0].trim(),
			genre: exports.remove_html(item_meta[1].trim()),
			views: views ? Number(views.replace(/\.|,/g, '')) : null,
			price: exports.between(item, '<span class="button-label">', '</span>').replace(/^[^ ]+ /, '') || null
		}
	})
	return {
		type: 'shelf-compact',
		title: exports.remove_html(exports.between(string, '<span class="branded-page-module-title-text">', '</span>')),
		items: items
	};
}

// vertical shelf of youtube video proposals
exports.parse_shelf_vertical = function(string) {
	const items_raw = string.split('<a aria-hidden="').splice(1);
	return {
		type: 'shelf-vertical',
		title: exports.remove_html(exports.between(string, '<span class="branded-page-module-title-text">', '</span>')),
		items: items_raw.map(function(item) { return exports.parse_video(item) })
	};
}

// taken from https://github.com/fent/node-ytdl-core/
exports.between = function(haystack, left, right) {
	var pos;
	pos = haystack.indexOf(left);
	if(pos === -1) { return ''; }
	haystack = haystack.slice(pos + left.length);
	if(!right) { return haystack; }
	pos = haystack.indexOf(right);
	if(pos === -1) { return ''; }
	haystack = haystack.slice(0, pos);
	return haystack;
};

// cleans up html text
exports.remove_html = function(string) {
	return new Entities().decode(
		string.replace(/\n/g, ' ')
		.replace(/\s*<\s*br\s*\/?\s*>\s*/gi, '\n')
		.replace(/<\s*\/\s*p\s*>\s*<\s*p[^>]*>/gi, '\n')
		.replace(/<.*?>/gi, '')
		.replace(/"/g, '\\"')
	).trim();
};
