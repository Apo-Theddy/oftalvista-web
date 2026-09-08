<?php
declare(strict_types=1);

namespace Oftalvista\Core;

final class Cache
{
    public static function redis(): mixed
    {
        return null;
    }

    public static function forgetBlog(): void
    {
        // Cache is intentionally disabled on Vercel; its filesystem is ephemeral.
    }
}
