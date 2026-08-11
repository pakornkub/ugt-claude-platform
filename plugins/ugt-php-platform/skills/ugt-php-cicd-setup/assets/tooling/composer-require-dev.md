# composer require --dev

## Standard case

```bash
composer require --dev friendsofphp/php-cs-fixer phpstan/phpstan phpunit/phpunit
```

## Legacy case (no composer.json)

```bash
composer init --no-interaction --name org/__PROJECT_NAME__
composer require --dev friendsofphp/php-cs-fixer phpstan/phpstan phpunit/phpunit
```
