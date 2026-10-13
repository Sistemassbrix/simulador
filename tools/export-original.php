<?php
// Solo SELECT. Ejecutado dentro del contenedor original, nunca servido por HTTP.
require '/var/www/html/config/database.php';
$db = (new Database())->getConnection();
$db->exec("SET time_zone = '+00:00'");
$db->beginTransaction();
$result = ['captured_at'=>gmdate('c'), 'source'=>'active simula', 'tables'=>[], 'schema'=>[]];
foreach ($db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
  if (!preg_match('/^[a-zA-Z0-9_]+$/', $table)) throw new Exception('Invalid table');
  $result['tables'][$table] = $db->query("SELECT * FROM `$table` ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
  $result['schema'][$table] = $db->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM)[1];
}
$db->rollBack();
echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR);
