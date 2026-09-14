<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class RequestController extends Controller
{
    public function index()
    {
        return response()->json([['id' => 1, 'employee' => 'somchai', 'status' => 'pending']]);
    }

    public function attach(Request $request, int $id)
    {
        $path = $request->file('file')->storeAs('uploads', $id.'-'.$request->file('file')->getClientOriginalName());

        return response()->json(['stored' => $path]);
    }
}
