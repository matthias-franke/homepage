<?php

$v8 = new V8Js();

try {
  var_dump($v8->executeString("print('Hello')"));
} catch (V8JsException $e) {
  var_dump($e);
}

?>