<?php
// org มาตรฐาน PSR-12
$finder = PhpCsFixer\Finder::create()->in(__DIR__)->exclude('vendor');
return (new PhpCsFixer\Config())->setRules(['@PSR12' => true])->setFinder($finder);
