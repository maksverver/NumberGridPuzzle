"use strict";

var BASE64_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
var PARAMETERS = {};
var PUZZLE = [];

function GetHeight(solution) { return solution.length; }
function GetWidth(solution) { return solution.length > 0 ? solution[0].length : 0; }

function DecodeSolution(code) {
  var bits_left = 0, buffer = 0, i = 0;
  function GetBit() {
    if (bits_left == 0) {
      if (i == code.length) return null;
      buffer = BASE64_DIGITS.indexOf(code.charAt(i++));
      if (buffer < 0) return null;
      bits_left = 6;
    }
    var b = buffer & 1;
    buffer >>= 1;
    bits_left--;
    return b;
  }
  function Get() {
    var res = 0;
    while (GetBit()) ++res;
    return res;
  }
  var height = Get(), width = Get(), solution = [];
  for (let i = 0; i < height; ++i) {
    solution.push([]);
    for (let j = 0; j < width; ++j) {
      solution[i].push(Get());
    }
  }
  return solution;
}

function EncodeSolution(solution) {
  var next_bit = 0, buffer = 0, res = "";
  function AddBit(b) {
    if (b) buffer |= 1 << next_bit;
    if (++next_bit == 6) {
      res += BASE64_DIGITS.charAt(buffer);
      next_bit = buffer = 0;
    }
  }
  function Add(n) {
    while (n-- > 0) AddBit(1);
    AddBit(0);
  }
  var height = GetHeight(solution), width = GetWidth(solution);
  Add(height);
  Add(width);
  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      Add(solution[i][j]);
    }
  }
  if (next_bit != 0) res += BASE64_DIGITS.charAt(buffer);
  return res;
}

function DecodeHash(s) {
  if (s != '' && s[0] == '#') s = s.substr(1);
  var p = {};
  for (let part of s.split('&')) {
    var i = part.indexOf('=');
    if (i < 0) continue;
    p[decodeURIComponent(part.substr(0, i))] = decodeURIComponent(part.substr(i + 1))
  }
  return p;
}

function EncodeHash(p) {
  var s = '#';
  for (let key in p) {
    if (s != '#') s += '&';
    s += encodeURIComponent(key) + '=' + encodeURIComponent(p[key]);
  }
  return s;
}

function MakePuzzle(solution) {
  var height = GetHeight(solution), width = GetWidth(solution), puzzle = [];
  for (let i = 0; i < height; ++i) {
    puzzle.push([])
    for (let j = 0; j < width; ++j) {
      puzzle[i].push(0);
    }
  }
  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      for (let k = 0; k < solution[i][j]; ++k) {
        for (let ii = 0; ii < height; ++ii) puzzle[ii][j]++;
        for (let jj = 0; jj < width; ++jj) puzzle[i][jj]++;
        puzzle[i][j]--;
      }
    }
  }
  return puzzle;
}

function IsSolved(puzzle) {
  var height = GetHeight(puzzle), width = GetWidth(puzzle);
  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      if (puzzle[i][j] > 0) return false;
    }
  }
  return true;
}

function IsMovePossible(puzzle) {
  var height = GetHeight(puzzle), width = GetWidth(puzzle);
  var have_row = false, have_col = false;
  for (let i = 0; i < height && !have_row; ++i) {
    var ok = true;
    for (let j = 0; j < width && ok; ++j) ok = ok && puzzle[i][j] > 0;
    have_row = have_row || ok;
  }
  for (let j = 0; j < width && !have_col; ++j) {
    var ok = true;
    for (let i = 0; i < height && ok; ++i) ok = ok && puzzle[i][j] > 0;
    have_col = have_col || ok;
  }
  return have_row && have_col;
}

function GetStatusMessage() {
  if (IsSolved(PUZZLE)) {
    return 'Puzzle solved! Well done. :-D';
  }
  if (!IsMovePossible(PUZZLE)) {
    return 'No more moves possible! You lost :-(';
  }
  if (JSON.stringify(PUZZLE) == JSON.stringify(GetInitialPuzzle())) {
    return 'Starting from scratch! Click a square to begin.';
  }
  return 'Game in progress...'
}

function UpdateStatus() {
  var elem = document.getElementById('puzzle-status');
  while (elem.firstChild) elem.removeChild(elem.firstChild);
  elem.appendChild(document.createTextNode(GetStatusMessage()));
}

function UpdatePuzzle() {
  var height = GetHeight(PUZZLE), width = GetWidth(PUZZLE);
  var table = document.getElementById('puzzle-table');
  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      var cell = table.rows[i].cells[j];
      while (cell.firstChild) cell.removeChild(cell.firstChild);
      cell.appendChild(document.createTextNode(PUZZLE[i][j]));
    }
  }
  UpdateStatus();
}

function OnCellClick(row, col) {
  var height = GetHeight(PUZZLE), width = GetWidth(PUZZLE);
  for (let i = 0; i < height; ++i) if (PUZZLE[i][col] == 0) return;
  for (let j = 0; j < width; ++j) if (PUZZLE[row][j] == 0) return;
  for (let i = 0; i < height; ++i) PUZZLE[i][col]--;
  for (let j = 0; j < width; ++j) if (j != col) PUZZLE[row][j]--;
  UpdatePuzzle();
}

function GetInitialPuzzle() {
  return MakePuzzle(DecodeSolution(PARAMETERS['code']));
}

function Reset() {
  function MakeClickHandler(i, j) {
    return function(event) {
      OnCellClick(i, j);
      event.preventDefault();
    };
  }
  PUZZLE = GetInitialPuzzle();
  var height = GetHeight(PUZZLE), width = GetWidth(PUZZLE);
  var table = document.getElementById('puzzle-table');
  while (table.rows.length > 0) table.deleteRow(0);
  for (let i = 0; i < height; ++i) {
    let row = table.insertRow(i);
    for (let j = 0; j < width; ++j) {
      let cell = row.insertCell(j);
      cell.addEventListener('click', MakeClickHandler(i, j));
    }
  }
  UpdatePuzzle();
}

function LoadSolution(solution) {
  PARAMETERS['code'] = EncodeSolution(solution);
  window.location.hash = EncodeHash(PARAMETERS);

  var link_tag = document.getElementById('puzzle-link');
  link_tag.href = window.location;
  while (link_tag.firstChild) link_tag.removeChild(link_tag.firstChild);
  link_tag.appendChild(document.createTextNode(window.location));

  Reset();
}

(function(){
  var generator_min_width = document.getElementById('min-width');
  var generator_max_width = document.getElementById('max-width');
  var generator_min_height = document.getElementById('min-height');
  var generator_max_height = document.getElementById('max-height');
  var generator_min_clicks = document.getElementById('min-clicks');
  var generator_max_clicks = document.getElementById('max-clicks');

  function Generate() {
    function in_range(a, b, min, max) {
      return min <= a && a <= b && b <= max;
    }
    var min_height = parseInt(generator_min_height.value);
    var max_height = parseInt(generator_max_height.value);
    var min_width = parseInt(generator_min_width.value);
    var max_width = parseInt(generator_max_width.value);
    var min_clicks = parseInt(generator_min_clicks.value);
    var max_clicks = parseInt(generator_max_clicks.value);
    if (1 <= min_height && min_height <= max_height && max_height <= 100 &&
        1 <= min_width && min_width <= max_width && max_width <= 100 &&
        1 <= min_clicks && min_height <= max_height && max_clicks <= 100) {
      var height = Math.floor(Math.random() * (max_height - min_height + 1)) + min_height;
      var width = Math.floor(Math.random() * (max_width - min_width + 1)) + min_width;
      var clicks = Math.floor(Math.random() * (max_clicks - min_clicks + 1)) + min_clicks;
      var solution = [];
      for (let i = 0; i < height; ++i) {
        solution.push([]);
        for (let j = 0; j < width; ++j) {
          solution[i].push(0);
        }
      }
      for (var k = 0; k < clicks; ++k) {
        var i = Math.floor(Math.random()*height);
        var j = Math.floor(Math.random()*width);
        solution[i][j]++;
      }
      LoadSolution(solution);
    } else {
      alert('Generator parameters out of range!');
    } 
  }
  
  document.getElementById('generate-button').addEventListener('click', Generate);
  document.getElementById('reset-puzzle').addEventListener('click', Reset);

  var solution = null;
  if (window.location.hash) {
    PARAMETERS = DecodeHash(window.location.hash);
    if (PARAMETERS['code']) solution = DecodeSolution(PARAMETERS['code']);
  }
  if (solution) {
    LoadSolution(solution);
  } else {
    Generate();
  }
}())