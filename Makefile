###############################################################################
# Makefile that handles Seer.Js dependencies

SRC_DIR = src
OUT_DIR = build
DOC_DIR = docs
TEST_DIR = test
# METHANE_SRC = ../methane

TMP_JS = ${OUT_DIR}/compiled.js
TMP_MIN = ${OUT_DIR}/compiled.min.js
EXPOSED_JS = ${OUT_DIR}/exposed.js
SEER_JS = ${OUT_DIR}/seer.js
SEER_MIN = ${OUT_DIR}/seer.min.js

# Build SeerJs and minify
default: seerjs

all: seerjs all-docs

seerjs: seerjs-build minify
	mv ${TMP_JS} ${SEER_JS}
	mv ${TMP_MIN} ${SEER_MIN}

# Build SeerJs with documentation
all-docs: docs

seerjs-build: clean core utils all_apis

###############################################################################

head:
	cat ${SRC_DIR}/seer.js >> ${TMP_JS}

docs: FORCE
	-rm -fr $(DOC_DIR)/*
	java -classpath jsdoc/lib/js.jar \
	  org.mozilla.javascript.tools.shell.Main \
	  -modules jsdoc/node_modules \
	  -modules jsdoc/rhino_modules \
	  -modules jsdoc \
	  jsdoc/jsdoc.js \
	  --dirname=jsdoc \
	  --destination docs $(SEER_JS)
	cp ${SRC_DIR}/docs-static/index.html $(DOC_DIR)
	cp ${SRC_DIR}/docs-static/images/* $(DOC_DIR)/img

minify:
	java -jar bin/compiler.jar \
		--compilation_level=SIMPLE_OPTIMIZATIONS \
		--js=$(TMP_JS) \
		--js_output_file=$(TMP_MIN)

	cat ${SRC_DIR}/logo.txt ${TMP_MIN} > ${OUT_DIR}/tmp && mv ${OUT_DIR}/tmp ${TMP_MIN}

clean:
	-rm -fr ${OUT_DIR}/*
	-rm -fr ${DOC_DIR}/*

clipboard:
	cat ${SEER_MIN} | pbcopy
	echo 'Seer.Js copied to clipboard'

FORCE:

###############################################################################
# Core

core: head
	cat \
	${SRC_DIR}/core/error.js  \
	${SRC_DIR}/core/http.js \
	${SRC_DIR}/core/settings.js \
	${SRC_DIR}/core/test.js \
	${SRC_DIR}/core/url.js \
	${SRC_DIR}/core/utils.js \
	${SRC_DIR}/utils/utils.js \
	${SRC_DIR}/core/native_ext/array.js \
	${SRC_DIR}/core/native_ext/string.js \
	>> ${TMP_JS}

###############################################################################
# Utils

utils:
	cat \
	${SRC_DIR}/utils/ga_helpers/ga_helpers.js \
	${SRC_DIR}/utils/google_scraper/google_scraper.js \
	${SRC_DIR}/utils/google_scraper/serp_parser.js \
	${SRC_DIR}/formatting/array_cells/array_transform.js \
	${SRC_DIR}/utils/on_page/on_page.js  \
	${SRC_DIR}/utils/redirection/redirection.js  \
	${SRC_DIR}/utils/hashes.js  \
	>> ${TMP_JS}

###############################################################################
# Apis

all_apis: google_group klout majestic raven seomoz twitter

google_group: google_analytics google_auth

google_analytics: core
	cat ${SRC_DIR}/api/google_analytics.js >> ${TMP_JS}

google_analytics3: core
	cat ${SRC_DIR}/api/google_analytics3.js >> ${TMP_JS}

google_webmaster: core
	cat ${SRC_DIR}/api/google_webmaster.js >> ${TMP_JS}

google_auth: core
	cat ${SRC_DIR}/api/google_auth.js >> ${TMP_JS}

harvest: core
	cat ${SRC_DIR}/api/harvest.js >> ${TMP_JS}

klout: core
	cat ${SRC_DIR}/api/klout.js >> ${TMP_JS}

majestic: core
	cat ${SRC_DIR}/api/majestic.js >> ${TMP_JS}

raven: core
	cat ${SRC_DIR}/api/raven.js >> ${TMP_JS}

seomoz: core
	cat ${SRC_DIR}/api/seomoz.js >> ${TMP_JS}

twitter: core
	cat ${SRC_DIR}/api/twitter.js >> ${TMP_JS}

