# CMAKE generated file: DO NOT EDIT!
# Generated by "Unix Makefiles" Generator, CMake Version 3.5

# Delete rule output on recipe failure.
.DELETE_ON_ERROR:


#=============================================================================
# Special targets provided by cmake.

# Disable implicit rules so canonical targets will work.
.SUFFIXES:


# Remove some rules from gmake that .SUFFIXES does not remove.
SUFFIXES =

.SUFFIXES: .hpux_make_needs_suffix_list


# Suppress display of executed commands.
$(VERBOSE).SILENT:


# A target that is always out of date.
cmake_force:

.PHONY : cmake_force

#=============================================================================
# Set environment variables for the build.

# The shell in which to execute make rules.
SHELL = /bin/sh

# The CMake executable.
CMAKE_COMMAND = /usr/bin/cmake

# The command to remove a file.
RM = /usr/bin/cmake -E remove -f

# Escaping for special characters.
EQUALS = =

# The top-level source directory on which CMake was run.
CMAKE_SOURCE_DIR = /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src

# The top-level build directory on which CMake was run.
CMAKE_BINARY_DIR = /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64

# Utility rule file for ClangDiagnosticSerialization.

# Include the progress variables for this target.
include tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/progress.make

tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization: tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc


tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc: tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Updating DiagnosticSerializationKinds.inc..."
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic && /usr/bin/cmake -E copy_if_different /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc

tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: bin/clang-tblgen
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/Diagnostic.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticGroups.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticCategories.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticDocs.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/arm_neon.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticFrontendKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticLexKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticSerializationKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/CommentNodes.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/AttrDocs.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticCommonKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticAnalysisKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticASTKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DeclNodes.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/StmtNodes.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticSemaKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticCommentKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/Attr.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticParseKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/DiagnosticDriverKinds.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/CodeGen/ValueTypes.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/TableGen/SearchableTable.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAMDGPU.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsBPF.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsSystemZ.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsNVVM.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Intrinsics.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Attributes.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsX86.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsHexagon.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsXCore.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsARM.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAArch64.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsMips.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsPowerPC.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsWebAssembly.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Option/OptParser.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetCallingConv.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetItinerary.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/Target.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/GenericOpcodes.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetSelectionDAG.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetGlobalISel.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetSchedule.td
tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/Diagnostic.td
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Building DiagnosticSerializationKinds.inc..."
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic && ../../../../../bin/clang-tblgen -gen-clang-diags-defs -clang-component=Serialization -I /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic -I /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic/Diagnostic.td -o /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp

ClangDiagnosticSerialization: tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization
ClangDiagnosticSerialization: tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc
ClangDiagnosticSerialization: tools/clang/include/clang/Basic/DiagnosticSerializationKinds.inc.tmp
ClangDiagnosticSerialization: tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/build.make

.PHONY : ClangDiagnosticSerialization

# Rule to build all files generated by this target.
tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/build: ClangDiagnosticSerialization

.PHONY : tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/build

tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/clean:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic && $(CMAKE_COMMAND) -P CMakeFiles/ClangDiagnosticSerialization.dir/cmake_clean.cmake
.PHONY : tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/clean

tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/depend:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/clang/include/clang/Basic /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : tools/clang/include/clang/Basic/CMakeFiles/ClangDiagnosticSerialization.dir/depend

