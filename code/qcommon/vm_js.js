var LibraryVM = {
	global_obj: function() {
		try {
			return global;
		} catch(e) {
			return window;
		}
	},
	$VM__deps: ['$SYSC', 'Cvar_VariableString'],
	$VM: {
		// vmHeader_t: Runtime.generateStructInfo([
		// 	['i32', 'vmMagic'],
		// 	['i32', 'instructionCount'],
		// 	['i32', 'codeOffset'],
		// 	['i32', 'codeLength'],
		// 	['i32', 'dataOffset'],
		// 	['i32', 'dataLength'],
		// 	['i32', 'litLength'],
		// 	['i32', 'bssLength'],
		// 	['i32', 'jtrgLength']
		// ]),
		vmHeader_t:{
			__size__:36,
			vmMagic:0,
			instructionCount:4,
			codeOffset:8,
			codeLength:12,
			dataOffset:16,
			dataLength:20,
			litLength:24,
			bssLength:28,
			jtrgLength:32
		},
		// vm_t: Runtime.generateStructInfo([
		// 	['i32', 'programStack'],
		// 	['i32*', 'systemCall'],
		// 	['b64', 'name'],
		// 	['void*', 'searchPath'],
		// 	['void*', 'dllHandle'],
		// 	['i32*', 'entryPoint'],
		// 	['void*', 'destroy'],
		// 	['i32', 'currentlyInterpreting'],
		// 	['i32', 'compiled'],
		// 	['i8*', 'codeBase'],
		// 	['i32', 'entryOfs'],
		// 	['i32', 'codeLength'],
		// 	['i32*', 'instructionPointers'],
		// 	['i32', 'instructionCount'],
		// 	['i8*', 'dataBase'],
		// 	['i32', 'dataMask'],
		// 	['i32', 'dataAlloc'],
		// 	['i32', 'stackBottom'],
		// 	['i32', 'numSymbols'],
		// 	['void*', 'symbols'],
		// 	['i32', 'callLevel'],
		// 	['i32', 'breakFunction'],
		// 	['i32', 'breakCount'],
		// 	['i8*', 'jumpTableTargets'],
		// 	['i32', 'numJumpTableTargets']
		// ]),
		vm_t:{
			__size__:160,
			programStack:0,
			systemCall:4,
			name:8,
			searchPath:72,
			dllHandle:76,
			entryPoint:80,
			destroy:84,
			currentlyInterpreting:88,
			compiled:92,
			codeBase:96,
			entryOfs:100,
			codeLength:104,
			instructionPointers:108,
			instructionCount:112,
			dataBase:116,
			dataMask:120,
			dataAlloc:124,
			stackBottom:128,
			numSymbols:132,
			symbols:136,
			callLevel:140,
			breakFunction:144,
			breakCount:148,
			jumpTableTargets:152,
			numJumpTableTargets:156
		},
		// vmSymbol_s: Runtime.generateStructInfo([
		// 	['void*', 'next'],
		// 	['i32', 'symValue'],
		// 	['i32', 'profileCount'],
		// 	['b1', 'synName'],
		// ]),
		vmSymbol_s:	{
			next: 0,
			symValue: 4,
			profileCount: 8,
			symName: 12
		},
		vms: [],
		MAX_VMMAIN_ARGS: 13,
		ENTRY_FRAME_SIZE: 8 + 4 * 13,
		OPSTACK_SIZE: 1024,
		TYPE: {
			F4: 1,
			I4: 2,
			U4: 3
		},
		Constant4: function (state) {
			var v = ({{{ makeGetValue('state.codeBase', 'state.pc', 'i8') }}} & 0xff) |
				(({{{ makeGetValue('state.codeBase', 'state.pc+1', 'i8') }}} & 0xff) << 8) |
				(({{{ makeGetValue('state.codeBase', 'state.pc+2', 'i8') }}} & 0xff) << 16) |
				(({{{ makeGetValue('state.codeBase', 'state.pc+3', 'i8') }}} & 0xff) << 24 );
			state.pc += 4;
			return v;
		},
		Constant1: function (state) {
			var v = {{{ makeGetValue('state.codeBase', 'state.pc', 'i8') }}};
			state.pc += 1;
			return v;
		},
		FindLabels: function (state) {
			var labels = {};

			var op, lastop;
			for (state.instr = 0, state.pc = 0; state.instr < state.instructionCount; state.instr++) {
				op = {{{ makeGetValue('state.codeBase', 'state.pc', 'i8') }}};

				state.pc++;

				// create a label after each unconditional branching operator
				// FIXME this is a bit excessive
				if (lastop === 5 /* OP_CALL */ || lastop === 10 /* OP_JUMP */ || lastop === 7 /* OP_POP */ || lastop === 6 /* OP_PUSH */) {
					labels[state.instr] = true;
				}

				switch (op) {
					case 3 /* OP_ENTER */:
					case 4 /* OP_LEAVE */:
					case 9 /* OP_LOCAL */:
					case 34 /* OP_BLOCK_COPY */:
						VM.Constant4(state);
					break;

					case 8 /* OP_CONST */:
						var value = VM.Constant4(state);
						var nextop = {{{ makeGetValue('state.codeBase', 'state.pc', 'i8') }}};
						if (nextop === 10 /* OP_JUMP */) {
							labels[value] = true;
						}
						break;

					case 33 /* OP_ARG */:
						VM.Constant1(state);
					break;

					case 11 /* OP_EQ */:
					case 12 /* OP_NE */:
					case 13 /* OP_LTI */:
					case 14 /* OP_LEI */:
					case 15 /* OP_GTI */:
					case 16 /* OP_GEI */:
					case 17 /* OP_LTU */:
					case 18 /* OP_LEU */:
					case 19 /* OP_GTU */:
					case 20 /* OP_GEU */:
					case 21 /* OP_EQF */:
					case 22 /* OP_NEF */:
					case 23 /* OP_LTF */:
					case 24 /* OP_LEF */:
					case 25 /* OP_GTF */:
					case 26 /* OP_GEF */:
						// create labels for any explicit branch destination
						labels[VM.Constant4(state)] = true;
					break;

					default:
					break;
				}

				lastop = op;
			}

			return labels;
		},
		GetSymbols: function(symbolsAddress) {
			if (symbolsAddress === 0) {
				return null;
			}
			var symbols = {};
			
			while (symbolsAddress != 0) {
				if ((symbolsAddress & 3) != 0) {
					throw new Error('Aha');
				}
				var name = Pointer_stringify(symbolsAddress + VM.vmSymbol_s.symName);
				var address = {{{ makeGetValue('symbolsAddress', 'VM.vmSymbol_s.symValue', 'i32') }}}
				symbols[address] = name;
				symbolsAddress = {{{ makeGetValue('symbolsAddress', 'VM.vmSymbol_s.next', 'void*') }}};
			}
			return symbols;
		},
		CompileModule: function (name, instructionCount, codeBase, dataBase, symbolsAddress) {
			var fs_game = Pointer_stringify(_Cvar_VariableString(allocate(intArrayFromString('fs_game'), 'i8', ALLOC_STACK)));

			var state = {
				name: name,
				instructionCount: instructionCount,
				codeBase: codeBase,
				dataBase: dataBase,
				pc: 0,
				instr: 0
			};

			var labels = VM.FindLabels(state);
			var symbols = VM.GetSymbols(symbolsAddress);
			var fninstr = 0;
			var eof = false;
			var ab = new ArrayBuffer(4);
			var i32 = new Int32Array(ab);
			var u32 = new Uint32Array(ab);
			var f32 = new Float32Array(ab);
			var callargs = [];

			//
			// expressions
			//
			var exprStack = [];

			function simplify(codeStr) {
				code = codeStr.split('');
				var openingBrackets = [];
			
				var scopes = [];
				var useChar = code.map(function (x) { return true; });
				
				var bracket = {
					scope: {
						open: '{',
						close: '}'
					},
					parent: {
						open: '(',
						close: ')'
					},
					ind: {
						open: '[',
						close: ']'
					}
				};
				var openingBracket = '{';
				for (var i = 0; i < code.length; ++i) {
					if (code[i] === bracket.scope.open) {
						openingBrackets.push({ index: i, scopeType: bracket.scope.close });
					} else if (code[i] === bracket.parent.open) {
						openingBrackets.push({ index: i, scopeType: bracket.parent.close });
					} else if (code[i] === bracket.ind.open) {
						openingBrackets.push({ index: i, scopeType: bracket.ind.close });
					} else if (code[i] === bracket.scope.close || code[i] === bracket.parent.close || code[i] === bracket.ind.close) {
						if (openingBrackets.length === 0 || openingBrackets[openingBrackets.length - 1].scopeType !== code[i]) {
							throw new Error('Syntax error:' + codeStr + '@' + codeStr.substr(i));
						}
			
						scopes.push({ start: openingBrackets[openingBrackets.length - 1].index, end: i, type: code[i] });  
						openingBrackets.pop();
					}
				}
			
				if (openingBrackets.length != 0) {
					throw new Error('Syntax error:' + codeStr + '@$');
				}
			
				for (var i = 1; i < scopes.length; ++i) {
					var adjacentScope = scopes[i].end - scopes[i - 1].end === 1 && scopes[i - 1].start - scopes[i].start === 1;
					if (scopes[i - 1].type === bracket.parent.close && scopes[i].type === bracket.ind.close && adjacentScope) {
						useChar[scopes[i - 1].start] = false;
						useChar[scopes[i - 1].end] = false;
					}
					if (scopes[i - 1].type === bracket.parent.close && scopes[i].type === bracket.parent.close && adjacentScope) {
						useChar[scopes[i - 1].start] = false;
						useChar[scopes[i - 1].end] = false;
					}
				}
			
				return code.map(function (c, index) { return useChar[index] ? c : ''; }).join('');
			}

			function PUSH_EXPR(expr) {
				exprStack.push(expr);
			}

			function POP_EXPR(type) {
				return exprStack.pop();
			}

			function BITCAST_STR(type, expr) {
				if (type === expr.type) {
					return expr.toString();
				}

				function MARK_TYPE_STR(type, expr) {
					switch (type) {
						case VM.TYPE.F4:
							return '(+' + expr + ')';
						case VM.TYPE.I4:
							return '(' + expr + '|0)';
						case VM.TYPE.U4:
							return '(' + expr + '>>>0)';
						default:
							throw new Error('unexpected data type');
					}
				}

				if (expr.type === VM.TYPE.I4 && type === VM.TYPE.F4) {
					if (expr instanceof CNST) {
						i32[0] = expr.value;
						return MARK_TYPE_STR(type, f32[0]);
					}

					if (expr instanceof LOAD4) {
						// by default, every pointer value is loaded from HEAP32
						// don't use the scratch array if we can load directly from HEAPF32
						return MARK_TYPE_STR(type, simplify('{{{ makeGetValue("' + OFFSET_STR(expr.addr) + '", 0, "float") }}}'));
					}
					return MARK_TYPE_STR(type, '_conv_i32_f32((' + expr + ')|0)');
				} else if (expr.type === VM.TYPE.U4 && type === VM.TYPE.F4) {
					return MARK_TYPE_STR(type, '_conv_u32_f32((' + expr + ')>>>0)');
				} else if (expr.type === VM.TYPE.F4 && type === VM.TYPE.I4) {
					return MARK_TYPE_STR(type, '_conv_f32_i32(+(' + expr + '))');
				} else if (expr.type === VM.TYPE.U4 && type === VM.TYPE.I4) {
					return MARK_TYPE_STR(type,  '(' + expr.toString() + ')');
				} else if (expr.type === VM.TYPE.F4 && type === VM.TYPE.U4) {
					return MARK_TYPE_STR(type, '_conv_f32_u32(+(' + expr + '))');
				} else if (expr.type === VM.TYPE.I4 && type === VM.TYPE.U4) {
					return MARK_TYPE_STR(type, '(' + expr.toString() + ')');
				} else {
					throw new Error('unsupported bitcast operands ' + expr.type + ' ' + type);
				}
			}

			function OFFSET_STR(expr) {
				if (expr instanceof CNST) {
					return state.dataBase + expr.value;
				} else if (expr instanceof LOCAL) {
					return state.dataBase + expr.offset + '+STACKTOP';
				}
				return state.dataBase + '+' + expr;
			}

			function CNST(value) {
				var ctor = CNST.ctor;
				if (!ctor) {
					ctor = CNST.ctor = function (value) {
						this.type = VM.TYPE.I4;
						this.value = value;
					};
					ctor.prototype = Object.create(CNST.prototype);
					ctor.prototype.toString = function () {
						return this.value.toString();
					};
				}
				return new ctor(value);
			}

			function LOCAL(offset) {
				var ctor = LOCAL.ctor;
				if (!ctor) {
					ctor = LOCAL.ctor = function (offset) {
						this.type = VM.TYPE.I4;
						this.offset = offset;
					};
					ctor.prototype = Object.create(LOCAL.prototype);
					ctor.prototype.toString = function () {
						return 'STACKTOP+' + this.offset.toString();
					};
				}
				return new ctor(offset);
			}

			function LOAD4(addr) {
				var ctor = LOAD4.ctor;
				if (!ctor) {
					ctor = LOAD4.ctor = function (addr) {
						this.type = VM.TYPE.I4;
						this.addr = addr;
					};
					ctor.prototype = Object.create(LOAD4.prototype);
					ctor.prototype.toString = function () {
						return '((' + simplify('{{{ makeGetValue("' + OFFSET_STR(this.addr) + '", 0, "i32") }}}') + ')|0)';
					};
				}
				return new ctor(addr);
			}

			function LOAD2(addr) {
				var ctor = LOAD2.ctor;
				if (!ctor) {
					ctor = LOAD2.ctor = function (addr) {
						this.type = VM.TYPE.I4;
						this.addr = addr;
					};
					ctor.prototype = Object.create(LOAD2.prototype);
					ctor.prototype.toString = function () {
						// TODO add makeGetValue u16
						return '(HEAPU16[(' + OFFSET_STR(this.addr) + ') >> 1]|0)';
					};
				}
				return new ctor(addr);
			}

			function LOAD1(addr) {
				var ctor = LOAD1.ctor;
				if (!ctor) {
					ctor = LOAD1.ctor = function (addr) {
						this.type = VM.TYPE.I4;
						this.addr = addr;
					};
					ctor.prototype = Object.create(LOAD1.prototype);
					ctor.prototype.toString = function () {
						// TODO add makeGetValue u8
						return '(HEAPU8[(' + OFFSET_STR(this.addr) + ')>>0]|0)';
					};
				}
				return new ctor(addr);
			}

			function UNARY(type, op, expr) {
				var ctor = UNARY.ctor;
				if (!ctor) {
					ctor = UNARY.ctor = function (type, op, expr) {
						this.type = type;
						this.op = op;
						this.expr = expr;
					};
					ctor.prototype = Object.create(UNARY.prototype);
					ctor.prototype.toString = function () {
						var expr = BITCAST_STR(this.type, this.expr);

						switch (this.op) {
							case 35 /* OP_SEX8 */:
								return '(((' + expr + ')<<24)>>24)';

							case 36 /* OP_SEX16 */:
								return '(((' + expr + ')<<16)>>16)';

							case 37 /* OP_NEGI */:
								return '(-(' + expr + '))';

							case 49 /* OP_BCOM */:
								return '((' + expr + ')^-1)';

							case 53 /* OP_NEGF */:
								return '((-.0)-(' + expr + '))';

							default:
								throw new Error('unknown op type for unary expression');
						}
					};
				}
				return new ctor(type, op, expr);
			}

			function BINARY(type, op, lhs, rhs) {
				var ctor = BINARY.ctor;
				if (!ctor) {
					ctor = BINARY.ctor = function (type, op, lhs, rhs) {
						this.type = type;
						this.op = op;
						this.lhs = lhs;
						this.rhs = rhs;
					};
					ctor.prototype = Object.create(BINARY.prototype);
					ctor.prototype.toString = function () {
						var lhs = '(' + BITCAST_STR(this.type, this.lhs) + ')';
						var rhs = '(' + BITCAST_STR(this.type, this.rhs) + ')';

						switch (this.op) {
							case 38 /* OP_ADD */:
								return '((((' + lhs + ')|0)' + '+' + '((' + rhs + ')|0))|0)';
							case 54 /* OP_ADDF */:
								return '(+(' + lhs + '))' + '+' + '(+(' + rhs + '))';

							case 39 /* OP_SUB */:
								return '((((' + lhs + ')|0)' + '-' + '((' + rhs + ')|0))|0)';
							case 55 /* OP_SUBF */:
								return '(+(' + lhs + '))' + '-' + '(+(' + rhs + '))';

							case 40 /* OP_DIVI */:
								return '((((' + lhs + ')|0)' + '/' + '((' + rhs + ')|0))|0)';
							case 41 /* OP_DIVU */:
								return '((((' + lhs + ')>>>0)' + '/' + '((' + rhs + ')>>>0))>>>0)';
							case 56 /* OP_DIVF */:
								return '(+(' + lhs + '))' + '/' + '(+(' + rhs + '))';

							case 42 /* OP_MODI */:
								return '((((' + lhs + ')|0)' + '%' + '((' + rhs + ')|0))|0)';
							case 43 /* OP_MODU */:
								return '((((' + lhs + ')>>>0)' + '%' + '((' + rhs + ')>>>0))>>>0)';

							case 44 /* OP_MULI */:
								return '(Math_imul((' + lhs + ')|0, (' + rhs +')|0)|0)';
							case 45 /* OP_MULU */:
								return '(Math_imul((' + lhs + ')>>>0, (' + rhs +')>>>0)>>>0)';

							case 57 /* OP_MULF */:
								return lhs + '*' + rhs;

							case 46 /* OP_BAND */:
								return lhs + '&' + rhs;

							case 47 /* OP_BOR */:
								return lhs + '|' + rhs;

							case 48 /* OP_BXOR */:
								return lhs + '^' + rhs;

							case 50 /* OP_LSH */:
								return lhs + '<<' + rhs;

							case 51 /* OP_RSHI */:
								return lhs + '>>' + rhs;

							case 52 /* OP_RSHU */:
								return lhs + '>>>' + rhs;

							default:
								throw new Error('unknown op type for binary expression');
						}
					};
				}
				return new ctor(type, op, lhs, rhs);
			}

			function CONVERT(type, from_type, expr) {
				var ctor = CONVERT.ctor;
				if (!ctor) {
					ctor = CONVERT.ctor = function (type, from_type, expr) {
						this.type = type;
						this.from_type = from_type;
						this.expr = expr;
					};
					ctor.prototype = Object.create(CONVERT.prototype);
					ctor.prototype.toString = function () {
						var bitCastStr = BITCAST_STR(this.from_type, this.expr);
						switch (this.type) {
							case VM.TYPE.I4:
								switch (this.from_type) {
								case VM.TYPE.I4:
									return '((' + bitCastStr + ')|0)';
								case VM.TYPE.U4:
									return '((' + bitCastStr + ')|0)';
								case VM.TYPE.F4:
									return '(~~Math_floor(+(' + bitCastStr + ')))';
								default:
									throw new Error('Unknown type: ' + this.from_type);
								}
							case VM.TYPE.U4:
								switch (this.from_type) {
								case VM.TYPE.I4:
									return '((' + bitCastStr + ')>>>0)';
								case VM.TYPE.U4:
									return '((' + bitCastStr + ')>>>0)';
								case VM.TYPE.F4:
									return '(~~Math_floor(+(' + bitCastStr + ')))';
								default:
									throw new Error('Unknown type: ' + this.from_type);
								}
							case VM.TYPE.F4:
								switch (this.from_type) {
								case VM.TYPE.I4:
									return '(+((' + bitCastStr + ')|0))';
								case VM.TYPE.U4:
									return '(+((' + bitCastStr + ')>>>0))';
								case VM.TYPE.F4:
									return '(+(' + bitCastStr + '))';
								default:
									throw new Error('Unknown type: ' + this.from_type);
								}
							default:
								throw new Error('Unknown type: ' + this.type);
						}
					};
				}
				return new ctor(type, from_type, expr);
			}

			//
			// statements
			//
			var moduleStr = '';
			var indent = 0;

			
			function EmitStatement(str) {
				var prefix = '';
				for (var i = 0; i < indent; i++) {
					prefix += '\t';
				}
				moduleStr += prefix + str + '\n';
			}

			function EmitEnter(frameSize) {
				functions.push(fninstr);
				if (fninstr === 0) {
					EmitStatement('function fn_' + fninstr + '() { fn_' + name + '(); } function fn_' + name + '() {');
				}
				else {
					EmitStatement('function fn_' + fninstr + '() {');
					if (symbols && symbols[fninstr]) {
						var functionName = symbols[fninstr];
						EmitStatement(functionName + '(); } function ' + functionName + '() {');
					}
				}
				indent++;
				EmitStatement('var label = ' + fninstr + ';');
				EmitStatement('while (1) switch (label|0) {');
				indent++;
				EmitStatement('case ' + fninstr + ':');
				indent++;
				EmitStatement('STACKTOP = STACKTOP - ' + frameSize + '|0;');
			}

			function EmitLeave(frameSize, ret) {
				// leave the return value on the stack
				EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(frameSize - 4)) + '", 0, "' + ret + '", "i32") }}}') + ';');
				EmitStatement('STACKTOP = STACKTOP + ' + frameSize + '|0;');
				EmitStatement('return;');

				if (eof) {
					indent--;
					indent--;
					EmitStatement('}');
					indent--;
					EmitStatement('}');
				}
			}

			function EmitCall(addr) {
				var translate = {
					bitpit: {
						'cgame': {
							'-101': 'memset',
							'-102': 'memcpy',
							'-103': 'strncpy',
							'-104': 'sin',
							'-105': 'cos',
							'-106': 'atan2',
							'-107': 'sqrt',
							'-111': 'floor',
							'-112': 'ceil'
						},
						'qagame': {
								'-101': 'memset',
								'-102': 'memcpy',
								'-103': 'strncpy',
								'-104': 'sin',
								'-105': 'cos',
								'-106': 'atan2',
								'-107': 'sqrt',
								'-111': 'floor',
								'-112': 'ceil'
						},
						'ui': {
							'-101': 'memset',
							'-102': 'memcpy',
							'-103': 'strncpy',
							'-104': 'sin',
							'-105': 'cos',
							'-106': 'atan2',
							'-107': 'sqrt',
							'-108': 'floor',
							'-109': 'ceil'
						}
					},
					demoq3: {
						'cgame': {
							'-101': 'memset',
							'-102': 'memcpy',
							'-103': 'strncpy',
							'-104': 'sin',
							'-105': 'cos',
							'-106': 'atan2',
							'-107': 'sqrt',
							'-108': 'floor',
							'-109': 'ceil',
							'-112': 'acos'
						},
						'qagame': {
							'-101': 'memset',
							'-102': 'memcpy',
							'-103': 'strncpy',
							'-104': 'sin',
							'-105': 'cos',
							'-106': 'atan2',
							'-107': 'sqrt',
							'-111': 'floor',
							'-112': 'ceil'
						},
						'ui': {
							'-101': 'memset',
							'-102': 'memcpy',
							'-103': 'strncpy',
							'-104': 'sin',
							'-105': 'cos',
							'-106': 'atan2',
							'-107': 'sqrt',
							'-108': 'floor',
							'-109': 'ceil'
						},
					}
				};

				// emit return address info
				EmitStore4(LOCAL(0), fninstr);
				EmitStore4(LOCAL(4), state.instr + 1);

				// emit args
				while (callargs.length) {
					var arg = callargs.shift();
					EmitStore4(arg.addr, arg.value);
				}

				// go ahead and directly translate a few syscalls to speed things up
				var table = (translate[fs_game] || {})[state.name];
				var translation = table && table[addr];

				
				if (translation) {
					switch (translation) {
						case 'memset':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "_memset((' + state.dataBase + '+' + LOAD4(LOCAL(8)) + ')|0, (' + LOAD4(LOCAL(12)) + ')|0, (' + LOAD4(LOCAL(16)) + ')|0)|0", "i32") }}}') + ';');
						break;

						case 'memcpy':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "_memcpy((' + state.dataBase + '+' + LOAD4(LOCAL(8)) + ')|0, (' + state.dataBase + '+' + LOAD4(LOCAL(12)) + ')|0, (' + LOAD4(LOCAL(16)) + ')|0)|0", "i32") }}}') + ';');
						break;

						case 'strncpy':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "_strncpy((' + state.dataBase + '+' + LOAD4(LOCAL(8)) + ')|0, (' + state.dataBase + '+' + LOAD4(LOCAL(12)) + ')|0, (' + LOAD4(LOCAL(16)) + ')|0)|0", "i32") }}}') + ';');
						break;

						case 'sin':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "Math_sin(' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(8)))) + ')", "float") }}}') + ';');
						break;

						case 'cos':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "Math_cos(' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(8)))) + ')", "float") }}}') + ';');
						break;

						case 'atan2':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "Math_atan2(' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(8)))) + ', ' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(12)))) + ')", "float") }}}') + ';');
						break;

						case 'sqrt':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "Math_sqrt(' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(8)))) + ')", "float") }}}') + ';');
						break;

						case 'floor':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "Math_floor(' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(8)))) + ')", "float") }}}') + ';');
						break;

						case 'ceil':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "Math_ceil(' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(8)))) + ')", "float") }}}') + ';');
						break;

						case 'acos':
							EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(LOCAL(-4)) + '", 0, "Math_acos(' + (BITCAST_STR(VM.TYPE.F4, LOAD4(LOCAL(8)))) + ')", "float") }}}') + ';');
						break;
					}
				} else {
					var expr = 'call(' + addr + ')';

					// remove the indirection if we can
					if (addr instanceof CNST) {
						if (addr.value >= 0) {
							expr = 'fn_' + addr.value + '()';
						} else {
							expr = 'syscall(' + addr.value + ')';
						}
					}

					EmitStatement(simplify(expr + ';'));
				}

				// push return value to stack
				PUSH_EXPR(LOAD4(LOCAL(-4)));
			}

			function EmitJump(label) {
				EmitStatement('label = (' + label + ')|0;');
				EmitStatement('break;');
			}

			function EmitConditionalJump(lhs, rhs, cond, label) {
				var expr = '(' + lhs + ') ' +
					cond +
					' (' + rhs + ')';

				EmitStatement('if (' + expr + ') {');
				indent++;
				EmitJump(label);
				indent--;
				EmitStatement('}');
			}

			function EmitStore4(addr, value) {
				if (value.type === VM.TYPE.F4) {
					EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(addr) + '", 0, "' + value + '", "float") }}}') + ';');
				} else {
					EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(addr) + '", 0, "' + value + '", "i32") }}}') + ';');
				}
			}

			function EmitStore2(addr, value) {
				EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(addr) + '", 0, "' + value + '", "i16") }}}') + ';');
			}

			function EmitStore1(addr, value) {
				EmitStatement(simplify('{{{ makeSetValue("' + OFFSET_STR(addr) + '", 0, "' + value + '", "i8") }}}') + ';');
			}

			function EmitBlockCopy(dest, src, bytes) {
				EmitStatement(simplify('{{{ makeCopyValues("' + '(' +  OFFSET_STR(dest) + ')|0' + '", "'  + '(' + OFFSET_STR(src) + ')|0' + '", "' + '(' +  bytes + ')|0' + '", "i8") }}};'));
			}

			EmitStatement('(function (global, env, buffer) {');
			indent++;

			EmitStatement('\'use asm\';');
			EmitStatement('var STACKTOP = 0;');
			EmitStatement('var call = env.call;');

			EmitStatement('var Math_floor=global.Math.floor;');
			EmitStatement('var Math_abs=global.Math.abs;');
			EmitStatement('var Math_sqrt=global.Math.sqrt;');
			EmitStatement('var Math_pow=global.Math.pow;');
			EmitStatement('var Math_cos=global.Math.cos;');
			EmitStatement('var Math_sin=global.Math.sin;');
			EmitStatement('var Math_tan=global.Math.tan;');
			EmitStatement('var Math_acos=global.Math.acos;');
			EmitStatement('var Math_asin=global.Math.asin;');
			EmitStatement('var Math_atan=global.Math.atan;');
			EmitStatement('var Math_atan2=global.Math.atan2;');
			EmitStatement('var Math_exp=global.Math.exp;');
			EmitStatement('var Math_log=global.Math.log;');
			EmitStatement('var Math_ceil=global.Math.ceil;');
			EmitStatement('var Math_imul=global.Math.imul;');
			EmitStatement('var Math_min=global.Math.min;');
			EmitStatement('var Math_max=global.Math.max;');
			EmitStatement('var Math_clz32=global.Math.clz32;');
			EmitStatement('var Math_fround=global.Math.fround;');
			EmitStatement('');
			EmitStatement('var HEAP8 = new global.Int8Array(buffer);');
			EmitStatement('var HEAP16 = new global.Int16Array(buffer);');
			EmitStatement('var HEAP32 = new global.Int32Array(buffer);');
			EmitStatement('var HEAPU8 = new global.Uint8Array(buffer);');
			EmitStatement('var HEAPU16 = new global.Uint16Array(buffer);');
			EmitStatement('var HEAPU32 = new global.Uint32Array(buffer);');
			EmitStatement('var HEAPF32 = new global.Float32Array(buffer);');
			EmitStatement('var HEAPF64 = new global.Float64Array(buffer);');
			EmitStatement('');
			EmitStatement('var _memset = env._memset;');
			EmitStatement('var _memcpy = env._memcpy;');
			EmitStatement('var _strncpy = env._strncpy;');
			EmitStatement('');
			EmitStatement('var _dynamicSystemCallWrapper=env._dynamicSystemCallWrapper;');
			EmitStatement('var _VM_SetCurrent = env._VM_GetCurrent;');
			EmitStatement('var _VM_GetCurrent = env._VM_GetCurrent;');
			EmitStatement('');
			EmitStatement('var VM_vm_t_dataBase = env.VM_vm_t_dataBase|0;');
			EmitStatement('var VM_vm_t_programStack = env.VM_vm_t_programStack|0;');
			EmitStatement('var VM_vm_t_systemCall = env.VM_vm_t_systemCall|0;');
			EmitStatement('');
			EmitStatement('var _conv_i32_u32 = env._conv_i32_u32;');
			EmitStatement('var _conv_i32_f32 = env._conv_i32_f32;');
			EmitStatement('var _conv_u32_i32 = env._conv_u32_i32;');
			EmitStatement('var _conv_u32_f32 = env._conv_u32_f32;');
			EmitStatement('var _conv_f32_i32 = env._conv_f32_i32;');
			EmitStatement('var _conv_f32_u32 = env._conv_f32_u32;');
			EmitStatement('');
			EmitStatement('function syscall(callnum) {');
			EmitStatement('    callnum = callnum | 0;');
			EmitStatement('    var savedVM = 0, stackOnEntry = 0, image = 0, returnAddr = 0, systemCall = 0, ret = 0;');
			EmitStatement('    callnum = ~callnum;');
			EmitStatement('	   // save the current vm');
			EmitStatement('	   savedVM = _VM_GetCurrent()|0;');
			EmitStatement('    stackOnEntry = STACKTOP|0;');
			EmitStatement('    image = ' + simplify('{{{ makeGetValue("savedVM|0", "VM_vm_t_dataBase|0", "i32") }}}') + '|0;');
			EmitStatement('    // store the callnum in the return address space');
			EmitStatement('    returnAddr = ' + simplify('{{{ makeGetValue("image", "stackOnEntry + 4|0", "i32") }}}') + '|0;');
			EmitStatement('    ' + simplify('{{{ makeSetValue("image", "stackOnEntry + 4|0", "callnum", "i32") }}}') + ';');
			EmitStatement('    // modify VM stack pointer for recursive VM entry');
			EmitStatement('    STACKTOP = STACKTOP - 4|0;')
			EmitStatement('    ' + simplify('{{{ makeSetValue("savedVM", "VM_vm_t_programStack", "STACKTOP", "i32") }}}') + ';');
			EmitStatement('    // call into the client');
			EmitStatement('    systemCall = ' + simplify('{{{ makeGetValue("savedVM", "VM_vm_t_systemCall|0", "i32*") }}}') + '|0;');
			EmitStatement('    ret = _dynamicSystemCallWrapper(systemCall|0, image + stackOnEntry + 4|0)|0;');
			EmitStatement('    // restore return address');
			EmitStatement('    ' + simplify('{{{ makeSetValue("image", "stackOnEntry + 4", "returnAddr", "i32") }}}') + ';');
			EmitStatement('    // leave the return value on the stack');
			EmitStatement('    ' + simplify('{{{ makeSetValue("image", "stackOnEntry - 4", "ret", "i32") }}}') + ';');
			EmitStatement('    STACKTOP = stackOnEntry|0;');
			EmitStatement('    ' + simplify('{{{ makeSetValue("savedVM", "VM_vm_t_programStack", "STACKTOP", "i32") }}}') + ';');
			EmitStatement('    _VM_SetCurrent(savedVM|0);');
			EmitStatement('    return;');
			EmitStatement('}');

			// EmitStatement('function call(addr) {');
			// EmitStatement('\taddr = addr | 0;');
			// EmitStatement('\tif (addr >= 0) {');
			// EmitStatement('\t\tvar fn = FUNCTIONS[addr];');
			// EmitStatement('\t\tfn();');
			// EmitStatement('\t\treturn;');
			// EmitStatement('\t}');
			// EmitStatement('\tsyscall(addr);');
			// EmitStatement('}');
			
			EmitStatement('function get_STACKTOP() {');
			EmitStatement('    return STACKTOP|0;');
			EmitStatement('}');
			EmitStatement('function set_STACKTOP(stacktop) {');
			EmitStatement('    stacktop = stacktop|0;');
			EmitStatement('    STACKTOP = stacktop;');
			EmitStatement('}');

			var functions = [];

			var lastop1, lastop2;
			for (state.instr = 0, state.pc = 0; state.instr < state.instructionCount; state.instr++) {
				var op = {{{ makeGetValue('state.codeBase', 'state.pc', 'i8') }}};

				state.pc++;

				if (labels[state.instr]) {
					indent--;
					EmitStatement('case ' + state.instr + ':');
					indent++;
				}

				switch (op) {
					//
					// expressions
					//
					case 6 /* OP_PUSH */:
						PUSH_EXPR(CNST(0));
						eof = true;
					break;

					case 7 /* OP_POP */:
						POP_EXPR();
					break;

					case 8 /* OP_CONST */:
						PUSH_EXPR(CNST(VM.Constant4(state)));
					break;

					case 9 /* OP_LOCAL */:
						PUSH_EXPR(LOCAL(VM.Constant4(state)));
					break;

					case 27 /* OP_LOAD1 */:
						PUSH_EXPR(LOAD1(POP_EXPR()));
					break;

					case 28 /* OP_LOAD2 */:
						PUSH_EXPR(LOAD2(POP_EXPR()));
					break;

					case 29 /* OP_LOAD4 */:
						PUSH_EXPR(LOAD4(POP_EXPR()));
					break;

					case 35 /* OP_SEX8 */:
					case 36 /* OP_SEX16 */:
					case 37 /* OP_NEGI */:
					case 49 /* OP_BCOM */:
						PUSH_EXPR(UNARY(VM.TYPE.I4, op, POP_EXPR()));
					break;

					case 53 /* OP_NEGF */:
						PUSH_EXPR(UNARY(VM.TYPE.F4, op, POP_EXPR()));
					break;

					case 38 /* OP_ADD */:
					case 39 /* OP_SUB */:
					case 40 /* OP_DIVI */:
					case 42 /* OP_MODI */:
					case 44 /* OP_MULI */:
					case 46 /* OP_BAND */:
					case 47 /* OP_BOR */:
					case 48 /* OP_BXOR */:
					case 50 /* OP_LSH */:
					case 51 /* OP_RSHI */:
						var rhs = POP_EXPR();
						var lhs = POP_EXPR();
						PUSH_EXPR(BINARY(VM.TYPE.I4, op, lhs, rhs));
					break;

					case 41 /* OP_DIVU */:
					case 43 /* OP_MODU */:
					case 45 /* OP_MULU */:
					case 52 /* OP_RSHU */:
						var rhs = POP_EXPR();
						var lhs = POP_EXPR();
						PUSH_EXPR(BINARY(VM.TYPE.U4, op, lhs, rhs));
					break;

					case 54 /* OP_ADDF */:
					case 55 /* OP_SUBF */:
					case 56 /* OP_DIVF */:
					case 57 /* OP_MULF */:
						var rhs = POP_EXPR();
						var lhs = POP_EXPR();
						PUSH_EXPR(BINARY(VM.TYPE.F4, op, lhs, rhs));
					break;

					case 58 /* OP_CVIF */:
						PUSH_EXPR(CONVERT(VM.TYPE.F4, VM.TYPE.I4, POP_EXPR()));
					break;

					case 59 /* OP_CVFI */:
						PUSH_EXPR(CONVERT(VM.TYPE.I4, VM.TYPE.F4, POP_EXPR()));
					break;

					//
					// statements
					//
					case 0 /* OP_UNDEF */:
					case 1 /* OP_IGNORE */:
					break;

					case 2 /* OP_BREAK */:
						EmitStatement('debugger;');
					break;

					case 3 /* OP_ENTER */:
						fninstr = state.instr;
						eof = false;
						EmitEnter(VM.Constant4(state));
					break;

					case 4 /* OP_LEAVE */:
						EmitLeave(VM.Constant4(state), BITCAST_STR(VM.TYPE.I4, POP_EXPR()));
					break;

					case 5 /* OP_CALL */:
						EmitCall(POP_EXPR());
					break;

					case 10 /* OP_JUMP */:
						// OP_LEAVE ops have explicit jumps written out afterwards that we can ignore
						// RETI4
						// ADDRGP4 $1
						// JUMPV
						var expr = POP_EXPR();
						if (!(lastop1 === 4 /* OP_LEAVE */ && lastop2 === 8 /* OP_CONST */)) {
							var instr = BITCAST_STR(VM.TYPE.I4, expr);
							EmitJump(instr);
						}
					break;

					case 11 /* OP_EQ */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						EmitConditionalJump(lhs, rhs, '==', VM.Constant4(state));
					break;

					case 12 /* OP_NE */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						EmitConditionalJump(lhs, rhs, '!=', VM.Constant4(state));
					break;

					case 13 /* OP_LTI */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						EmitConditionalJump(lhs, rhs, '<', VM.Constant4(state));
					break;

					case 14 /* OP_LEI */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						EmitConditionalJump(lhs, rhs, '<=', VM.Constant4(state));
					break;

					case 15 /* OP_GTI */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						EmitConditionalJump(lhs, rhs, '>', VM.Constant4(state));
					break;

					case 16 /* OP_GEI */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.I4, POP_EXPR()) + ')|0';
						EmitConditionalJump(lhs, rhs, '>=', VM.Constant4(state));
					break;

					case 17 /* OP_LTU */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						EmitConditionalJump(lhs, rhs, '<', VM.Constant4(state));
					break;

					case 18 /* OP_LEU */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						EmitConditionalJump(lhs, rhs, '<=', VM.Constant4(state));
					break;

					case 19 /* OP_GTU */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						EmitConditionalJump(lhs, rhs, '>', VM.Constant4(state));
					break;

					case 20 /* OP_GEU */:
						var rhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						var lhs = '(' + BITCAST_STR(VM.TYPE.U4, POP_EXPR()) + ')>>>0';
						EmitConditionalJump(lhs, rhs, '>=', VM.Constant4(state));
					break;

					case 21 /* OP_EQF */:
						var rhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						var lhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						EmitConditionalJump(lhs, rhs, '==', VM.Constant4(state));
					break;

					case 22 /* OP_NEF */:
						var rhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						var lhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						EmitConditionalJump(lhs, rhs, '!=', VM.Constant4(state));
					break;

					case 23 /* OP_LTF */:
						var rhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						var lhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						EmitConditionalJump(lhs, rhs, '<', VM.Constant4(state));
					break;

					case 24 /* OP_LEF */:
						var rhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						var lhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						EmitConditionalJump(lhs, rhs, '<=', VM.Constant4(state));
					break;

					case 25 /* OP_GTF */:
						var rhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						var lhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						EmitConditionalJump(lhs, rhs, '>', VM.Constant4(state));
					break;

					case 26 /* OP_GEF */:
						var rhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						var lhs = '+(' + BITCAST_STR(VM.TYPE.F4, POP_EXPR()) + ')';
						EmitConditionalJump(lhs, rhs, '>=', VM.Constant4(state));
					break;

					case 30 /* OP_STORE1 */:
						var value = BITCAST_STR(VM.TYPE.I4, POP_EXPR());
						var addr = POP_EXPR();
						EmitStore1(addr, value);
					break;

					case 31 /* OP_STORE2 */:
						var value = BITCAST_STR(VM.TYPE.I4, POP_EXPR());
						var addr = POP_EXPR();
						EmitStore2(addr, value);
					break;

					case 32 /* OP_STORE4 */:
						var value = POP_EXPR();
						var addr = POP_EXPR();
						EmitStore4(addr, value);
					break;

					case 33 /* OP_ARG */:
						var value = POP_EXPR();
						var addr = LOCAL(VM.Constant1(state));
						callargs.push({ addr: addr, value: value });
					break;

					case 34 /* OP_BLOCK_COPY */:
						var src = POP_EXPR();
						var dest = POP_EXPR();
						var bytes = VM.Constant4(state);
						EmitBlockCopy(dest, src, bytes);
					break;
				}

				lastop1 = lastop2;
				lastop2 = op;
			}

			EmitStatement('return {');
				EmitStatement('    fn_' + name + ' : fn_' + name + ',');
			functions.forEach(function(fun) {
				EmitStatement('    fn_' + fun + ' : fn_' + fun + ',');
			});
			EmitStatement('    syscall: syscall,');
			EmitStatement('    get_STACKTOP: get_STACKTOP,');
			EmitStatement('    set_STACKTOP: set_STACKTOP');
			EmitStatement('};');
			indent--;
			EmitStatement('})');

			return moduleStr;
		},
	},
	VM_Compile__sig: 'vii',
	VM_Compile__deps: ['$SYSC', '$VM', 'global_obj', 'VM_Destroy'],
	VM_Compile: function (vmp, headerp) {
		var current = _VM_GetCurrent();
		var name = Pointer_stringify(vmp + VM.vm_t.name);
		var dataBase = {{{ makeGetValue('vmp', 'VM.vm_t.dataBase', 'i8*') }}};
		var codeOffset = {{{ makeGetValue('headerp', 'VM.vmHeader_t.codeOffset', 'i32') }}};
		var instructionCount = {{{ makeGetValue('headerp', 'VM.vmHeader_t.instructionCount', 'i32') }}};
		var symbols = {{{ makeGetValue('vmp', 'VM.vm_t.symbols', 'void*') }}};

		var vm;
		try {
			var start = Date.now();

			var module = VM.CompileModule(name, instructionCount, headerp + codeOffset, dataBase, symbols);

			var ab = new ArrayBuffer(4);
			var i32 = new Int32Array(ab);
			var u32 = new Uint32Array(ab);
			var f32 = new Float32Array(ab);

			var functionByAddress = { };

			vm = eval(module)(
				_global_obj(),
				{
					// these proxies are here because otherwise a bug in chrome is triggered
					// internal wasm linker error 
					_VM_SetCurrent: function(__1) {
						return _VM_SetCurrent(__1);
					},
					_VM_GetCurrent: function() {
						return _VM_GetCurrent();
					},
					VM_vm_t_dataBase: VM.vm_t.dataBase,
					VM_vm_t_programStack: VM.vm_t.programStack,
					VM_vm_t_systemCall: VM.vm_t.systemCall,
					_memset: function (_1, _2, _3) {
						_memset(_1, _2, _3);
					},
					_memcpy: function (_1, _2, _3) {
						_memcpy(_1, _2, _3);
					},
					_strncpy: function (_1, _2, _3) {
						_strncpy(_1, _2, _3);
					},
					_conv_i32_u32: function(value) {
						i32[0] = value;
						return u32[0];
					},
					_conv_i32_f32: function(value) {
						i32[0] = value;
						return f32[0];
					},
					_conv_u32_i32: function(value) {
						u32[0] = value;
						return i32[0];
					},
					_conv_u32_f32: function(value) {
						u32[0] = value;
						return f32[0];
					},
					_conv_f32_i32: function(value) {
						f32[0] = value;
						return i32[0];
					},
					_conv_f32_u32: function(value) {
						f32[0] = value;
						return u32[0];
					},

					_dynamicSystemCallWrapper: function (systemCall, arg) {
						return dynCall_ii(systemCall|0, arg|0)|0;
					},
					call: function(address) {
						if (address >= 0) {
							functionByAddress[address]();
						} else {
							vm.syscall(address);
						}
					}
				}, 
				buffer
			);

			Object.getOwnPropertyNames(vm).forEach(function(name) {
				if (name.startsWith('fn_')) {
					functionByAddress[name.substr('fn_'.length)] = vm[name];
				}
			});
			
			vm.fn_0 = vm['fn_' + name];

			SYSC.Print('VM file ' + name + ' compiled in ' + (Date.now() - start) + ' milliseconds');
		} catch (e) {
			if (e.longjmp || e === 'longjmp') {
				throw e;
			}
			SYSC.Error('fatal', e);
		}

		var handle = VM.vms.length+1;
		VM.vms[handle] = vm;

		if (!VM.DestroyPtr) {
			VM.DestroyPtr = _VM_Destroy;
		}

		{{{ makeSetValue('vmp', 'VM.vm_t.entryOfs', 'handle', 'i32') }}};
		{{{ makeSetValue('vmp', 'VM.vm_t.destroy', 'VM.DestroyPtr', 'void*') }}};
	},
	VM_Destroy: function (vmp) {
		var handle = {{{ makeGetValue('vmp', 'VM.vm_t.entryOfs', 'i32') }}};

		delete VM.vms[handle];
	},
	VM_CallCompiled__sig: 'iii',
	VM_CallCompiled__deps: ['$SYSC', '$VM', 'VM_GetCurrent', 'VM_SetCurrent'],
	VM_CallCompiled: function (vmp, args) {
		var handle = {{{ makeGetValue('vmp', 'VM.vm_t.entryOfs', 'i32') }}};
		var vm = VM.vms[handle];

		// set the current vm
		var savedVM = _VM_GetCurrent();
		_VM_SetCurrent(vmp);

		// save off the stack pointer
		var image = {{{ makeGetValue('vmp', 'VM.vm_t.dataBase', 'i32') }}};

		// set up the stack frame
		var stackOnEntry = {{{ makeGetValue('vmp', 'VM.vm_t.programStack', 'i32') }}};
		var stackTop = stackOnEntry - VM.ENTRY_FRAME_SIZE;

		{{{ makeSetValue('image', 'stackTop', '-1', 'i32') }}};
		{{{ makeSetValue('image', 'stackTop + 4', '0', 'i32') }}};

		for (var i = 0; i < VM.MAX_VMMAIN_ARGS; i++) {
			var arg = {{{ makeGetValue('args', 'i * 4', 'i32' )}}};
			{{{ makeSetValue('image', 'stackTop + 8 + i * 4', 'arg', 'i32') }}};
		}

		// call into the entry point
		var result;

		try {
			var entryPoint = vm.fn_0;

			vm.set_STACKTOP(stackTop);

			entryPoint();

			if (vm.get_STACKTOP() !== (stackOnEntry - VM.ENTRY_FRAME_SIZE)) {
				SYSC.Error('fatal', 'program stack corrupted, is ' + vm.get_STACKTOP() + ', expected ' + (stackOnEntry - VM.ENTRY_FRAME_SIZE));
			}

			result = {{{ makeGetValue('image', 'vm.get_STACKTOP() - 4', 'i32') }}};

			{{{ makeSetValue('vmp', 'VM.vm_t.programStack', 'stackOnEntry', 'i32') }}};
		} catch (e) {
			console.log(e);
			SYSC.Error('fatal', 'Error happened while executing the virtual machine');
		}

		// restore the current vm
		_VM_SetCurrent(savedVM);

		// return value is at the top of the stack still
		return result;
	},
};

mergeInto(LibraryManager.library, LibraryVM);
