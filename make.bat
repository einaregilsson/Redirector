::
:: Build script for extension
::
:: Einar Þór Egilsson - 26.10.2006
::

SET EXT=Redirector.xpi

IF NOT EXIST build md build
IF EXIST build\%EXT% del build\%EXT%
zip -r build\%EXT% *.* -x build* *.py *.bat